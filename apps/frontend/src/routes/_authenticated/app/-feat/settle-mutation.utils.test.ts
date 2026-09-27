import * as Result from 'effect/Result';
import { describe, expect, it } from 'vitest';

import { settleMutation } from './settle-mutation.utils';

describe('settleMutation', () => {
  it('passes a typed success or failure through unchanged', async () => {
    await expect(
      settleMutation(Promise.resolve(Result.succeed(1)))
    ).resolves.toEqual(Result.succeed(1));
    await expect(
      settleMutation(Promise.resolve(Result.fail({ _tag: 'Denied' })))
    ).resolves.toEqual(Result.fail({ _tag: 'Denied' }));
  });

  it('turns a rejected call into a failure instead of throwing', async () => {
    const networkError = new Error('offline');

    await expect(
      settleMutation(Promise.reject<Result.Result<number, never>>(networkError))
    ).resolves.toEqual(Result.fail(networkError));
  });
});
