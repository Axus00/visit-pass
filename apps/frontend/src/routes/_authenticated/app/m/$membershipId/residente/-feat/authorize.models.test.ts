import { FieldApi, FormApi } from '@tanstack/react-form';
import { describe, expect, it, vi } from 'vitest';

import {
  type AuthorizeFormValues,
  type FavoriteId,
  authorizeFormValidation,
  buildCreateAuthorizationPayload,
  defaultAuthorizeFormValues,
  resolveSharedValidity,
  validateAuthorizeForm,
} from './authorize.models';

// 2026-09-26 is a Saturday.
const today = '2026-09-26';

const temporary = (
  overrides: Partial<AuthorizeFormValues> = {}
): AuthorizeFormValues => ({
  ...defaultAuthorizeFormValues(today),
  visitorName: 'Juan Pérez',
  ...overrides,
});

describe('defaultAuthorizeFormValues', () => {
  it('starts today with a Lunes a viernes Servicio schedule', () => {
    const values = defaultAuthorizeFormValues(today);

    expect(values.type).toBe('temporary');
    expect(values.startDate).toBe(today);
    expect(values.endDate > today).toBe(true);
    expect(values.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(values.guests).toEqual([{ name: '', document: '' }]);
  });
});

describe('buildCreateAuthorizationPayload', () => {
  it('sends one trimmed Visitante for Temporal, dropping an empty document', () => {
    expect(
      buildCreateAuthorizationPayload(
        temporary({ visitorName: '  Juan  ', visitorDocument: '   ' })
      )
    ).toEqual({
      type: 'temporary',
      startDate: today,
      visitors: [{ name: 'Juan', document: undefined, favoriteId: undefined }],
    });
  });

  it('links the Favorito saved from the form', () => {
    const favoriteId = 'favorite-1' as FavoriteId;

    expect(
      buildCreateAuthorizationPayload(temporary(), favoriteId).visitors[0]
        ?.favoriteId
    ).toBe(favoriteId);
  });

  it('sends the guest list and event name for Evento', () => {
    expect(
      buildCreateAuthorizationPayload(
        temporary({
          type: 'event',
          eventName: ' Cumpleaños ',
          guests: [
            { name: 'Ana', document: '' },
            { name: 'Luis', document: '123456' },
          ],
        })
      )
    ).toEqual({
      type: 'event',
      startDate: today,
      eventName: 'Cumpleaños',
      visitors: [
        { name: 'Ana', document: undefined },
        { name: 'Luis', document: '123456' },
      ],
    });
  });

  it('sends a cleared Servicio end date as missing', () => {
    expect(
      buildCreateAuthorizationPayload(
        temporary({ type: 'service', endDate: '' })
      )
    ).toHaveProperty('endDate', undefined);
  });

  it('sends the range and weekdays for Servicio', () => {
    const payload = buildCreateAuthorizationPayload(
      temporary({ type: 'service', endDate: '2026-10-31', weekdays: [2, 4] })
    );

    expect(payload).toMatchObject({
      type: 'service',
      startDate: today,
      endDate: '2026-10-31',
      weekdays: [2, 4],
    });
  });
});

describe('validateAuthorizeForm', () => {
  it('accepts a complete Temporal form', () => {
    expect(validateAuthorizeForm(temporary(), today)).toBeUndefined();
  });

  it('requires the Visitante name and a real document when given', () => {
    expect(
      validateAuthorizeForm(
        temporary({ visitorName: ' ', visitorDocument: '12' }),
        today
      )?.fields
    ).toEqual({
      visitorName: 'Escribe el nombre del Visitante.',
      visitorDocument: 'El documento debe tener al menos 3 caracteres.',
    });
  });

  it('rejects a date before today on the date field', () => {
    expect(
      validateAuthorizeForm(temporary({ startDate: '2026-09-25' }), today)
        ?.fields
    ).toHaveProperty('startDate');
  });

  it('asks for a cleared Servicio end date instead of calling it out of order', () => {
    expect(
      validateAuthorizeForm(temporary({ type: 'service', endDate: '' }), today)
        ?.fields
    ).toEqual({ endDate: 'Indica la fecha final.' });
  });

  it('asks for a cleared start date instead of calling it past', () => {
    expect(
      validateAuthorizeForm(temporary({ startDate: '' }), today)?.fields
    ).toEqual({ startDate: 'Indica la fecha.' });
    expect(
      validateAuthorizeForm(
        temporary({
          type: 'event',
          startDate: '',
          guests: [{ name: 'Ana', document: '' }],
        }),
        today
      )?.fields
    ).toEqual({ startDate: 'Indica la fecha.' });
    expect(
      validateAuthorizeForm(
        temporary({ type: 'service', startDate: '', endDate: '2026-10-31' }),
        today
      )?.fields
    ).toEqual({ startDate: 'Indica la fecha de inicio.' });
  });

  it('keeps the field errors alongside a missing start date', () => {
    expect(
      validateAuthorizeForm(
        temporary({ startDate: '', visitorName: '' }),
        today
      )?.fields
    ).toEqual({
      startDate: 'Indica la fecha.',
      visitorName: 'Escribe el nombre del Visitante.',
    });
  });

  it('points Servicio range and weekday problems at their fields', () => {
    expect(
      validateAuthorizeForm(
        temporary({ type: 'service', endDate: '2026-09-20' }),
        today
      )?.fields
    ).toHaveProperty('endDate');
    expect(
      validateAuthorizeForm(temporary({ type: 'service', weekdays: [] }), today)
        ?.fields
    ).toHaveProperty('weekdays');
  });

  it('flags a Servicio whose range holds none of its weekdays on the weekday field', () => {
    // Saturday 26 to Sunday 27, allowed only Lunes a viernes.
    expect(
      validateAuthorizeForm(
        temporary({ type: 'service', endDate: '2026-09-27' }),
        today
      )?.fields
    ).toEqual({
      weekdays:
        'Ningún día entre las fechas elegidas cae en los días de la semana permitidos.',
    });
  });

  it('flags each unnamed guest row of an Evento', () => {
    expect(
      validateAuthorizeForm(
        temporary({
          type: 'event',
          guests: [
            { name: 'Ana', document: '' },
            { name: '', document: '' },
          ],
        }),
        today
      )?.fields
    ).toEqual({ 'guests[1].name': 'Escribe el nombre del Visitante.' });
  });
});

describe('authorizeFormValidation', () => {
  const mountForm = (
    defaultValues: AuthorizeFormValues,
    onSubmit: () => void
  ) => {
    const form = new FormApi({
      defaultValues,
      ...authorizeFormValidation(() => today),
      onSubmit,
    });
    form.mount();
    const field = <TName extends 'type' | 'startDate' | 'endDate' | 'weekdays'>(
      name: TName
    ) => {
      const api = new FieldApi({ form, name });
      api.mount();
      return api;
    };
    const fields = {
      type: field('type'),
      startDate: field('startDate'),
      endDate: field('endDate'),
      weekdays: field('weekdays'),
    };

    return { form, fields };
  };

  it('clears a range error on Fecha final once Fecha de inicio fixes it, and submits', async () => {
    const onSubmit = vi.fn();
    const { form, fields } = mountForm(
      temporary({
        type: 'service',
        startDate: '2026-10-20',
        endDate: '2026-10-10',
      }),
      onSubmit
    );

    await form.handleSubmit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(fields.endDate.state.meta.errors).toHaveLength(1);

    fields.startDate.handleChange('2026-10-01');
    expect(fields.endDate.state.meta.errors).toEqual([]);

    await form.handleSubmit();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('clears a weekday error once the range changes to include an allowed day', async () => {
    const onSubmit = vi.fn();
    // Saturday 26 to Sunday 27, allowed only Lunes a viernes.
    const { form, fields } = mountForm(
      temporary({ type: 'service', endDate: '2026-09-27' }),
      onSubmit
    );

    await form.handleSubmit();
    expect(fields.weekdays.state.meta.errors).toHaveLength(1);

    fields.endDate.handleChange('2026-09-28');
    expect(fields.weekdays.state.meta.errors).toEqual([]);

    await form.handleSubmit();
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('clears a Servicio-only error when the type changes to Temporal', async () => {
    const onSubmit = vi.fn();
    const { form, fields } = mountForm(
      temporary({ type: 'service', weekdays: [] }),
      onSubmit
    );

    await form.handleSubmit();
    expect(fields.weekdays.state.meta.errors).toHaveLength(1);

    fields.type.handleChange('temporary');
    expect(fields.weekdays.state.meta.errors).toEqual([]);

    await form.handleSubmit();
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe('resolveSharedValidity', () => {
  it('covers only the start day for Temporal', () => {
    expect(
      resolveSharedValidity(buildCreateAuthorizationPayload(temporary()), today)
    ).toMatchObject({ type: 'temporary', startDate: today, endDate: today });
  });

  it('keeps the sorted, deduplicated Servicio weekdays', () => {
    expect(
      resolveSharedValidity(
        buildCreateAuthorizationPayload(
          temporary({
            type: 'service',
            endDate: '2026-10-31',
            weekdays: [5, 1, 5],
          })
        ),
        today
      ).weekdays
    ).toEqual([1, 5]);
  });
});
