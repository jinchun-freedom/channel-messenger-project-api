import type {
  DocumentNode,
  ExecutionResult,
  FormattedExecutionResult,
} from 'graphql';
import type { GraphQLParams } from 'express-graphql';
import httpError from 'http-errors';
import {
  Source,
  GraphQLError,
  validateSchema,
  parse,
  validate,
  execute,
  formatError,
  getOperationAST,
  specifiedRules,
} from 'graphql';
import { getGraphQLParams } from 'express-graphql';

import type { Response } from 'koa';

import { renderGraphiQL } from './renderGraphiQL';
import type {
  GraphiQLData,
  GraphiQLOptions,
  Middleware,
  Options,
  OptionsData,
  // eslint-disable-next-line internal-rules/no-dir-import
} from './definition';
import {
  canDisplayGraphiQL,
  devAssertIsNonNullable,
  devAssertIsObject,
  // eslint-disable-next-line internal-rules/no-dir-import
} from './utils';

export const graphqlHTTP = (options: Options): Middleware => {
  devAssertIsNonNullable(options, 'GraphQL middleware requires options.');

  return async (ctx): Promise<void> => {
    const req = ctx.req;
    const request: any = ctx.request;
    const response = ctx.response;
    let params: GraphQLParams | undefined;
    let showGraphiQL = false;
    let graphiqlOptions: GraphiQLOptions | undefined;
    let formatErrorFn = formatError;
    let pretty = false;
    let result: ExecutionResult;

    try {
      try {
        const expressReq = req as any;
        expressReq.body = expressReq.body ?? request.body;

        params = await getGraphQLParams(expressReq);
      } catch (error: unknown) {
        const optionsData = await resolveOptions();
        pretty = optionsData.pretty ?? false;
        formatErrorFn =
          optionsData.customFormatErrorFn ??
          optionsData.formatError ??
          formatErrorFn;
        throw error;
      }
      const optionsData = await resolveOptions(params);
      const schema = optionsData.schema;
      const rootValue = optionsData.rootValue;
      const validationRules = optionsData.validationRules ?? [];
      const fieldResolver = optionsData.fieldResolver;
      const typeResolver = optionsData.typeResolver;
      const graphiql = optionsData.graphiql ?? false;
      const extensionsFn = optionsData.extensions;
      const context = optionsData.context ?? ctx;
      const parseFn = optionsData.customParseFn ?? parse;
      const executeFn = optionsData.customExecuteFn ?? execute;
      const validateFn = optionsData.customValidateFn ?? validate;

      pretty = optionsData.pretty ?? false;

      formatErrorFn =
        optionsData.customFormatErrorFn ??
        optionsData.formatError ??
        formatErrorFn;

      devAssertIsObject(
        schema,
        'GraphQL middleware options must contain a schema.',
      );

      if (request.method !== 'GET' && request.method !== 'POST') {
        throw httpError(405, 'GraphQL only supports GET and POST requests.', {
          headers: { Allow: 'GET, POST' },
        });
      }
      const { query, variables, operationName } = params;
      showGraphiQL = canDisplayGraphiQL(request, params) && graphiql !== false;
      if (typeof graphiql !== 'boolean') {
        graphiqlOptions = graphiql;
      }
      if (query == null) {
        if (showGraphiQL) {
          return respondWithGraphiQL(response, graphiqlOptions);
        }
        throw httpError(400, 'Must provide query string.');
      }
      const schemaValidationErrors = validateSchema(schema);
      if (schemaValidationErrors.length > 0) {
        // Return 500: Internal Server Error if invalid schema.
        throw httpError(500, 'GraphQL schema validation error.', {
          graphqlErrors: schemaValidationErrors,
        });
      }
      let documentAST: DocumentNode;
      try {
        documentAST = parseFn(new Source(query, 'GraphQL request'));
      } catch (syntaxError: unknown) {
        throw httpError(400, 'GraphQL syntax error.', {
          graphqlErrors: [syntaxError],
        });
      }
      const validationErrors = validateFn(schema, documentAST, [
        ...specifiedRules,
        ...validationRules,
      ]);

      if (validationErrors.length > 0) {
        throw httpError(400, 'GraphQL validation error.', {
          graphqlErrors: validationErrors,
        });
      }
      if (request.method === 'GET') {
        const operationAST = getOperationAST(documentAST, operationName);
        if (operationAST && operationAST.operation !== 'query') {
          if (showGraphiQL) {
            return respondWithGraphiQL(response, graphiqlOptions, params);
          }
          throw httpError(
            405,
            `Can only perform a ${operationAST.operation} operation from a POST request.`,
            { headers: { Allow: 'POST' } },
          );
        }
      }
      try {
        result = await executeFn({
          schema,
          document: documentAST,
          rootValue,
          contextValue: context,
          variableValues: variables,
          operationName,
          fieldResolver,
          typeResolver,
        });
        response.status = 200;
      } catch (contextError: unknown) {
        throw httpError(400, 'GraphQL execution context error.', {
          graphqlErrors: [contextError],
        });
      }
      if (extensionsFn) {
        const extensions = await extensionsFn({
          document: documentAST,
          variables,
          operationName,
          result,
          context,
        });

        if (extensions != null) {
          result = { ...result, extensions };
        }
      }
    } catch (rawError: unknown) {
      const error = httpError(
        500,
        rawError instanceof Error ? rawError : String(rawError),
      );
      response.status = error.status;

      const { headers } = error;
      if (headers != null) {
        for (const [key, value] of Object.entries(headers)) {
          response.set(key, value);
        }
      }

      if (error.graphqlErrors == null) {
        const graphqlError = new GraphQLError(
          error.message,
          undefined,
          undefined,
          undefined,
          undefined,
          error,
        );
        result = { data: undefined, errors: [graphqlError] };
      } else {
        result = { data: undefined, errors: error.graphqlErrors };
      }
    }
    if (response.status === 200 && result.data == null) {
      response.status = 500;
    }
    const formattedResult: FormattedExecutionResult = {
      ...result,
      errors: result.errors?.map(formatErrorFn),
    };
    if (showGraphiQL) {
      return respondWithGraphiQL(
        response,
        graphiqlOptions,
        params,
        formattedResult,
      );
    }
    const payload = pretty
      ? JSON.stringify(formattedResult, null, 2)
      : formattedResult;
    response.type = 'application/json';
    response.body = payload;

    async function resolveOptions(
      requestParams?: GraphQLParams,
    ): Promise<OptionsData> {
      const optionsResult = await Promise.resolve(
        typeof options === 'function'
          ? options(request, response, ctx, requestParams)
          : options,
      );
      devAssertIsObject(
        optionsResult,
        'GraphQL middleware option function must return an options object or a promise which will be resolved to an options object.',
      );
      if (optionsResult.formatError) {
        // eslint-disable-next-line no-console
        console.warn(
          '`formatError` is deprecated and replaced by `customFormatErrorFn`. It will be removed in version 1.0.0.',
        );
      }

      return optionsResult;
    }
  };
};

const respondWithGraphiQL = (
  response: Response,
  options?: GraphiQLOptions,
  params?: GraphQLParams,
  result?: FormattedExecutionResult,
): void => {
  const data: GraphiQLData = {
    query: params?.query,
    variables: params?.variables,
    operationName: params?.operationName,
    result,
  };
  const payload = renderGraphiQL(data, options);

  response.type = 'text/html';
  response.body = payload;
};
