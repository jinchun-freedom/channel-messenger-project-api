import type {
  EditorTheme,
  EditorThemeParam,
  GraphiQLData,
  GraphiQLOptions,
  // eslint-disable-next-line internal-rules/no-dir-import
} from './definition';

const CODE_MIRROR_VERSION = '5.53.2';

const safeSerialize = (data: string | boolean | null | undefined): string =>
  data != null ? JSON.stringify(data).replace(/\//g, '\\/') : 'undefined';

declare function loadFileStaticallyFromNPM(npmPath: string): string;

const getEditorThemeParams = (
  editorTheme: EditorThemeParam | undefined | null,
): EditorTheme | undefined => {
  if (editorTheme == null) {
    return;
  }
  if (typeof editorTheme === 'string') {
    return {
      name: editorTheme,
      link: `<link href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/${CODE_MIRROR_VERSION}/theme/${editorTheme}.css" rel="stylesheet" />`,
    };
  }
  if (
    typeof editorTheme === 'object' &&
    editorTheme.name &&
    typeof editorTheme.name === 'string' &&
    editorTheme.url &&
    typeof editorTheme.url === 'string'
  ) {
    return {
      link: `<link href="${editorTheme.url}" rel="stylesheet" />`,
      name: editorTheme.name,
    };
  }
  throw Error(
    'invalid parameter "editorTheme": should be undefined/null, string or ' +
      `{name: string, url: string} but provided is "${
        typeof editorTheme === 'object'
          ? JSON.stringify(editorTheme)
          : editorTheme
      }"`,
  );
};

export const renderGraphiQL = (
  data: GraphiQLData,
  options?: GraphiQLOptions,
): string => {
  const queryString = data.query;
  const variablesString =
    data.variables != null ? JSON.stringify(data.variables, null, 2) : null;
  const resultString =
    data.result != null ? JSON.stringify(data.result, null, 2) : null;
  const operationName = data.operationName;
  const defaultQuery = options?.defaultQuery;
  const headerEditorEnabled = options?.headerEditorEnabled;
  const shouldPersistHeaders = options?.shouldPersistHeaders;
  const subscriptionEndpoint = options?.subscriptionEndpoint;
  const websocketClient = options?.websocketClient ?? 'v0';
  const editorTheme = getEditorThemeParams(options?.editorTheme);

  let subscriptionScripts = '';
  if (subscriptionEndpoint != null) {
    if (websocketClient === 'v1') {
      subscriptionScripts = `
      <script>
        ${loadFileStaticallyFromNPM('graphql-ws/umd/graphql-ws.js')}
      </script>
      <script>
      ${loadFileStaticallyFromNPM(
        'subscriptions-transport-ws/browser/client.js',
      )}
      </script>
      `;
    } else {
      subscriptionScripts = `
      <script>
        ${loadFileStaticallyFromNPM(
          'subscriptions-transport-ws/browser/client.js',
        )}
      </script>
      <script>
        ${loadFileStaticallyFromNPM(
          'subscriptions-transport-ws/browser/client.js',
        )}
      </script>
      <script>
        ${loadFileStaticallyFromNPM(
          'graphiql-subscriptions-fetcher/browser/client.js',
        )}
      </script>
      `;
    }
  }

  return `<!--
The request to this GraphQL server provided the header "Accept: text/html"
and as a result has been presented GraphiQL - an in-browser IDE for
exploring GraphQL.
If you wish to receive JSON, provide the header "Accept: application/json" or
add "&raw" to the end of the URL within a browser.
-->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>GraphiQL</title>
  <meta name="robots" content="noindex" />
  <meta name="referrer" content="origin" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      margin: 0;
      overflow: hidden;
    }
    #graphiql {
      height: 100vh;
    }
  </style>
  <style>
    /* graphiql/graphiql.css */
    ${loadFileStaticallyFromNPM('graphiql/graphiql.css')}
  </style>
  ${editorTheme ? editorTheme.link : ''}
  <script>
    // promise-polyfill/dist/polyfill.min.js
    ${loadFileStaticallyFromNPM('promise-polyfill/dist/polyfill.min.js')}
  </script>
  <script>
    // unfetch/dist/unfetch.umd.js
    ${loadFileStaticallyFromNPM('unfetch/dist/unfetch.umd.js')}
  </script>
  <script>
    // react/umd/react.production.min.js
    ${loadFileStaticallyFromNPM('react/umd/react.production.min.js')}
  </script>
  <script>
    // react-dom/umd/react-dom.production.min.js
    ${loadFileStaticallyFromNPM('react-dom/umd/react-dom.production.min.js')}
  </script>
  <script>
    // graphiql/graphiql.min.js
    ${loadFileStaticallyFromNPM('graphiql/graphiql.min.js')}
  </script>
  ${subscriptionScripts}
</head>
<body>
  <div id="graphiql">Loading...</div>
  <script>
    // Collect the URL parameters
    var parameters = {};
    window.location.search.substr(1).split('&').forEach(function (entry) {
      var eq = entry.indexOf('=');
      if (eq >= 0) {
        parameters[decodeURIComponent(entry.slice(0, eq))] =
          decodeURIComponent(entry.slice(eq + 1));
      }
    });
    // Produce a Location query string from a parameter object.
    function locationQuery(params) {
      return '?' + Object.keys(params).filter(function (key) {
        return Boolean(params[key]);
      }).map(function (key) {
        return encodeURIComponent(key) + '=' +
          encodeURIComponent(params[key]);
      }).join('&');
    }
    // Derive a fetch URL from the current URL, sans the GraphQL parameters.
    var graphqlParamNames = {
      query: true,
      variables: true,
      operationName: true
    };
    var otherParams = {};
    for (var k in parameters) {
      if (parameters.hasOwnProperty(k) && graphqlParamNames[k] !== true) {
        otherParams[k] = parameters[k];
      }
    }
    var fetchURL = locationQuery(otherParams);
    // Defines a GraphQL fetcher using the fetch API.
    function graphQLFetcher(graphQLParams, opts) {
      return fetch(fetchURL, {
        method: 'post',
        headers: Object.assign(
          {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          opts && opts.headers,
        ),
        body: JSON.stringify(graphQLParams),
        credentials: 'include',
      }).then(function (response) {
        return response.json();
      });
    }

    function makeFetcher() {
      if('${typeof subscriptionEndpoint}' == 'string') {
        let client = null;
        let url = window.location.href;
        if('${typeof websocketClient}' == 'string' && '${websocketClient}' === 'v1') {
          client = window.graphqlWs.createClient({url: ${safeSerialize(
            subscriptionEndpoint,
          )} });
          return window.GraphiQL.createFetcher({url, wsClient: client});
        } else {
          let clientClass = window.SubscriptionsTransportWs.SubscriptionClient;
          client = new clientClass(${safeSerialize(subscriptionEndpoint)}, {
            reconnect: true
          });
          return window.GraphiQL.createFetcher({url, legacyClient: client});
        }
      } else {
        return graphQLFetcher;
      }
    }

    // When the query and variables string is edited, update the URL bar so
    // that it can be easily shared.
    function onEditQuery(newQuery) {
      parameters.query = newQuery;
      updateURL();
    }

    function onEditVariables(newVariables) {
      parameters.variables = newVariables;
      updateURL();
    }

    function onEditOperationName(newOperationName) {
      parameters.operationName = newOperationName;
      updateURL();
    }

    function updateURL() {
      history.replaceState(null, null, locationQuery(parameters));
    }

    // Render <GraphiQL /> into the body.
    ReactDOM.render(
      React.createElement(GraphiQL, {
        fetcher: makeFetcher(),
        onEditQuery: onEditQuery,
        onEditVariables: onEditVariables,
        onEditOperationName: onEditOperationName,
        editorTheme: ${safeSerialize(
          editorTheme ? editorTheme.name : undefined,
        )},
        query: ${safeSerialize(queryString)},
        response: ${safeSerialize(resultString)},
        variables: ${safeSerialize(variablesString)},
        operationName: ${safeSerialize(operationName)},
        defaultQuery: ${safeSerialize(defaultQuery)},
        headerEditorEnabled: ${safeSerialize(headerEditorEnabled)},
        shouldPersistHeaders: ${safeSerialize(shouldPersistHeaders)}
      }),
      document.getElementById('graphiql')
    );
  </script>
</body>
</html>`;
};
