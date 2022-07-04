import type { GraphQLParams } from 'express-graphql';
import type { Request } from 'koa';

export const canDisplayGraphiQL = (
  request: Request,
  params: GraphQLParams,
): boolean => !params.raw && request.accepts(['json', 'html']) === 'html';

export const devAssertIsObject = (value: unknown, message: string): void => {
  devAssert(value != null && typeof value === 'object', message);
};

export const devAssertIsNonNullable = (
  value: unknown,
  message: string,
): void => {
  devAssert(value != null, message);
};

export const devAssert = (condition: unknown, message: string): void => {
  const booleanCondition = Boolean(condition);
  if (!booleanCondition) {
    throw new TypeError(message);
  }
};

export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
