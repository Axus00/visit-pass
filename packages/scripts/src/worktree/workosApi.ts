import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Predicate from 'effect/Predicate';
import type * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import type * as HttpBody from 'effect/unstable/http/HttpBody';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import type * as HttpClientError from 'effect/unstable/http/HttpClientError';
import * as HttpClientRequest from 'effect/unstable/http/HttpClientRequest';
import * as HttpClientResponse from 'effect/unstable/http/HttpClientResponse';

export {
  WORKOS_ENVIRONMENT_ROLES,
  WORKOS_WEBHOOK_EVENTS,
  WorkosApi,
  WorkosApiError,
  type CreateEnvironmentRoleDto,
  type EnsureWebhookEndpointDto,
  type WebhookEndpoint,
};

const WEBHOOK_ENDPOINTS_URL = 'https://api.workos.com/webhook_endpoints';

const ENVIRONMENT_ROLES_URL = 'https://api.workos.com/authorization/roles';

const HTTP_CONFLICT = 409;

const LIST_PAGE_SIZE = 100;

/** Match the Convex handler, which consumes every event listed here. */
const WORKOS_WEBHOOK_EVENTS = [
  'user.created',
  'user.updated',
  'user.deleted',
  'organization_membership.created',
  'organization_membership.updated',
  'organization_membership.deleted',
  'invitation.accepted',
  'invitation.revoked',
] as const;

/** The Roles a Membresía can carry, mirrored onto WorkOS organization memberships. */
const WORKOS_ENVIRONMENT_ROLES = [
  { slug: 'residente', name: 'Residente' },
  { slug: 'portero', name: 'Portero' },
  { slug: 'administrador', name: 'Administrador' },
] as const;

class WorkosApiError extends Schema.TaggedError<WorkosApiError>()(
  'WorkosApiError',
  {
    message: Schema.String,
  }
) {}

const WebhookStatus = Schema.Literals(['enabled', 'disabled']);

const WebhookEndpoint = Schema.Struct({
  id: Schema.NonEmptyString,
  endpoint_url: Schema.NonEmptyString,
  secret: Schema.RedactedFromValue(Schema.NonEmptyString),
  status: WebhookStatus,
  events: Schema.Array(Schema.NonEmptyString),
});

type WebhookEndpoint = typeof WebhookEndpoint.Type;

const ListMetadata = Schema.Struct({
  after: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

const WebhookEndpointList = Schema.Struct({
  data: Schema.Array(WebhookEndpoint),
  list_metadata: Schema.optionalKey(ListMetadata),
});

const CreateWebhookEndpointDto = Schema.Struct({
  endpoint_url: Schema.NonEmptyString,
  events: Schema.Array(Schema.NonEmptyString),
});

const UpdateWebhookEndpointDto = Schema.Struct({
  status: WebhookStatus,
  events: Schema.Array(Schema.NonEmptyString),
});

const CreateEnvironmentRoleDto = Schema.Struct({
  slug: Schema.NonEmptyString,
  name: Schema.NonEmptyString,
});

type CreateEnvironmentRoleDto = typeof CreateEnvironmentRoleDto.Type;

type EnsureWebhookEndpointDto = {
  readonly url: string;
  readonly events: ReadonlyArray<string>;
};

type RequestFailure =
  HttpClientError.HttpClientError | HttpBody.HttpBodyError | Schema.SchemaError;

/** Opens a request pipeline with the credentials every WorkOS call needs. */
const authenticated =
  (apiKey: Redacted.Redacted<string>) =>
  (request: HttpClientRequest.HttpClientRequest) =>
    request.pipe(
      HttpClientRequest.bearerToken(apiKey),
      HttpClientRequest.acceptJson
    );

class WorkosApi extends Context.Service<
  WorkosApi,
  {
    readonly ensureWebhookEndpoint: (
      options: EnsureWebhookEndpointDto,
      apiKey: Redacted.Redacted<string>
    ) => Effect.Effect<WebhookEndpoint, WorkosApiError>;
    readonly ensureEnvironmentRoles: (
      roles: ReadonlyArray<CreateEnvironmentRoleDto>,
      apiKey: Redacted.Redacted<string>
    ) => Effect.Effect<void, WorkosApiError>;
  }
>()('@repo/scripts/worktree/WorkosApi') {
  static readonly layer: Layer.Layer<WorkosApi, never, HttpClient.HttpClient> =
    Layer.effect(
      WorkosApi,
      Effect.gen(function* () {
        const client = yield* HttpClient.HttpClient;

        /**
         * Reports a failed call. Discards request and response details because
         * either may contain credentials.
         */
        const toApiError = (operation: string) => (cause: RequestFailure) => {
          const detail = ((): string => {
            if (cause._tag !== 'HttpClientError') {
              return cause._tag;
            }

            const { reason } = cause;
            return 'response' in reason
              ? `${reason._tag} (HTTP ${reason.response.status})`
              : reason._tag;
          })();

          return new WorkosApiError({
            message: `WorkOS ${operation} failed: ${detail}.`,
          });
        };

        /**
         * Closes a request pipeline. Accepts the encoded request a body schema
         * produces as readily as a plain one, so every verb ends the same way.
         */
        const send =
          <S extends Schema.Top>(operation: string, response: S) =>
          (
            request:
              | HttpClientRequest.HttpClientRequest
              | Effect.Effect<
                  HttpClientRequest.HttpClientRequest,
                  HttpBody.HttpBodyError
                >
          ): Effect.Effect<S['Type'], WorkosApiError, S['DecodingServices']> =>
            (Effect.isEffect(request) ? request : Effect.succeed(request)).pipe(
              Effect.flatMap(client.execute),
              Effect.flatMap(HttpClientResponse.filterStatusOk),
              Effect.flatMap(HttpClientResponse.schemaBodyJson(response)),
              Effect.mapError(toApiError(operation)),
              Effect.withSpan(`workosApi.${operation}`)
            );

        /** Scans every page so duplicate URLs cannot yield an arbitrary signing secret. */
        const findByUrl = Effect.fn('findWorkosWebhookEndpointsByUrl')(
          function* (
            url: string,
            apiKey: Redacted.Redacted<string>,
            after: string | undefined
          ): Effect.fn.Return<ReadonlyArray<WebhookEndpoint>, WorkosApiError> {
            const page = yield* HttpClientRequest.get(
              WEBHOOK_ENDPOINTS_URL
            ).pipe(
              authenticated(apiKey),
              HttpClientRequest.setUrlParams(
                Predicate.isUndefined(after)
                  ? { limit: LIST_PAGE_SIZE }
                  : { limit: LIST_PAGE_SIZE, after }
              ),
              send('webhook endpoint list', WebhookEndpointList)
            );
            const matches = page.data.filter(
              (endpoint) => endpoint.endpoint_url === url
            );
            const nextCursor = page.list_metadata?.after ?? undefined;

            if (Predicate.isUndefined(nextCursor)) {
              return matches;
            }

            return [...matches, ...(yield* findByUrl(url, apiKey, nextCursor))];
          }
        );

        /** Retrying a POST after a lost response could create a second endpoint. */
        const create = (
          options: EnsureWebhookEndpointDto,
          apiKey: Redacted.Redacted<string>
        ) =>
          HttpClientRequest.post(WEBHOOK_ENDPOINTS_URL).pipe(
            authenticated(apiKey),
            HttpClientRequest.schemaBodyJson(CreateWebhookEndpointDto)({
              endpoint_url: options.url,
              events: options.events,
            }),
            send('webhook endpoint create', WebhookEndpoint)
          );

        const update = (
          id: string,
          events: ReadonlyArray<string>,
          apiKey: Redacted.Redacted<string>
        ) =>
          HttpClientRequest.patch(`${WEBHOOK_ENDPOINTS_URL}/${id}`).pipe(
            authenticated(apiKey),
            HttpClientRequest.schemaBodyJson(UpdateWebhookEndpointDto)({
              status: 'enabled',
              events,
            }),
            send('webhook endpoint update', WebhookEndpoint)
          );

        const ensureWebhookEndpoint = Effect.fn('ensureWorkosWebhookEndpoint')(
          function* (
            options: EnsureWebhookEndpointDto,
            apiKey: Redacted.Redacted<string>
          ): Effect.fn.Return<WebhookEndpoint, WorkosApiError> {
            const matches = yield* findByUrl(options.url, apiKey, undefined);

            if (matches.length > 1) {
              // Choosing one signing secret would reject deliveries from the others.
              return yield* new WorkosApiError({
                message: `WorkOS has ${matches.length} webhook endpoints for ${options.url} (${matches
                  .map((endpoint) => endpoint.id)
                  .join(
                    ', '
                  )}). Delete all but one in the WorkOS dashboard, then rerun setup.`,
              });
            }

            const [existing] = matches;

            if (Predicate.isUndefined(existing)) {
              return yield* create(options, apiKey);
            }

            const configuredEvents = new Set(existing.events);
            const desiredEvents = new Set(options.events);
            const isUpToDate =
              existing.status === 'enabled' &&
              configuredEvents.size === desiredEvents.size &&
              [...desiredEvents].every((event) => configuredEvents.has(event));

            return isUpToDate
              ? existing
              : yield* update(existing.id, options.events, apiKey);
          }
        );

        /** A conflict means an earlier run created the slug already. */
        const ensureEnvironmentRoles = Effect.fn(
          'ensureWorkosEnvironmentRoles'
        )(function* (
          roles: ReadonlyArray<CreateEnvironmentRoleDto>,
          apiKey: Redacted.Redacted<string>
        ): Effect.fn.Return<void, WorkosApiError> {
          for (const role of roles) {
            yield* HttpClientRequest.post(ENVIRONMENT_ROLES_URL).pipe(
              authenticated(apiKey),
              HttpClientRequest.schemaBodyJson(CreateEnvironmentRoleDto)(role),
              Effect.flatMap(client.execute),
              Effect.filterOrElse(
                (response) => response.status === HTTP_CONFLICT,
                HttpClientResponse.filterStatusOk
              ),
              Effect.mapError(toApiError('environment role create')),
              Effect.withSpan('workosApi.environment role create')
            );
          }
        });

        return WorkosApi.of({ ensureWebhookEndpoint, ensureEnvironmentRoles });
      })
    );
}
