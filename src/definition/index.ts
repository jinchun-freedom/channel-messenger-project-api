import type {
  ASTVisitor,
  DocumentNode,
  ExecutionArgs,
  ExecutionResult,
  GraphQLSchema,
  GraphQLFieldResolver,
  GraphQLTypeResolver,
  GraphQLFormattedError,
  ValidationContext,
  GraphQLError,
  Source,
  FormattedExecutionResult,
} from 'graphql';
import type { GraphQLParams, RequestInfo } from 'express-graphql';
import type { Context, Request, Response } from 'koa';

export type MaybePromise<T> = Promise<T> | T;
export type EditorThemeParam =
  | {
      name: string;
      url: string;
    }
  | string;

export type EditorTheme = {
  name: string;
  link: string;
};
export type Options =
  | ((
      request: Request,
      response: Response,
      ctx: Context,
      params?: GraphQLParams,
    ) => OptionsResult)
  | OptionsResult;
export type OptionsResult = MaybePromise<OptionsData>;

export type Middleware = (ctx: Context) => Promise<void>;
export interface GraphiQLData {
  query?: string | null;
  variables?: { readonly [name: string]: unknown } | null;
  operationName?: string | null;
  result?: FormattedExecutionResult;
}

export interface GraphiQLOptions {
  defaultQuery?: string;
  headerEditorEnabled?: boolean;
  shouldPersistHeaders?: boolean;
  subscriptionEndpoint?: string;
  websocketClient?: string;
  editorTheme?: EditorThemeParam;
}

export interface OptionsData {
  schema: GraphQLSchema;
  context?: unknown;
  rootValue?: unknown;
  pretty?: boolean;
  validationRules?: ReadonlyArray<(ctx: ValidationContext) => ASTVisitor>;
  customValidateFn?: (
    schema: GraphQLSchema,
    documentAST: DocumentNode,
    rules: ReadonlyArray<any>,
  ) => ReadonlyArray<GraphQLError>;
  customExecuteFn?: (args: ExecutionArgs) => MaybePromise<ExecutionResult>;
  customFormatErrorFn?: (error: GraphQLError) => GraphQLFormattedError;
  customParseFn?: (source: Source) => DocumentNode;
  formatError?: (error: GraphQLError, context?: any) => GraphQLFormattedError;
  extensions?: (
    info: RequestInfo,
  ) => MaybePromise<undefined | { [key: string]: unknown }>;
  graphiql?: boolean | GraphiQLOptions;
  fieldResolver?: GraphQLFieldResolver<unknown, unknown>;
  typeResolver?: GraphQLTypeResolver<unknown, unknown>;
}

export type mongoType = {
  _id: string;
};
