/* eslint-disable internal-rules/no-dir-import */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/prefer-ts-expect-error */
/* eslint-disable no-console */
import { createServer } from 'http';

import Koa from 'koa';
import mount from 'koa-mount';
import { execute, subscribe } from 'graphql';
import ws from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

import cors from '@koa/cors';

import { graphqlHTTP } from '../src/graphqlMiddleware';

import { schema, roots, rootValue } from '../src/schema/index';
import { PORT, SUBSCRIPTIONSURL } from '../src/config';

const subscriptionEndpoint = SUBSCRIPTIONSURL;

const app = new Koa();
app.use(cors());
app.use(
  mount(
    '/graphql',
    graphqlHTTP({
      schema,
      rootValue,
      graphiql: {
        subscriptionEndpoint,
        websocketClient: 'v1',
      },
    }),
  ),
);

const server = createServer(app.callback());

const wsServer = new ws.Server({
  server,
  path: '/subscriptions',
});

server.listen(PORT, () => {
  useServer(
    {
      schema,
      roots,
      execute,
      subscribe,
    },
    wsServer,
  );
  console.info(
    `Running a GraphQL API server with subscriptions at http://localhost:${PORT}/graphql`,
  );
});
