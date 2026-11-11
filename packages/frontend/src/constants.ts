import type { Template } from "shared";

export const scriptHelp = `Variables:
  input   the raw HTTP request (string)
  helper  functions returning a modified copy of the request

Modifiers (accept a value or a function of the current value):
  helper.setLine(input, 0, (line) => line.toUpperCase())
  helper.setMethod(input, "POST")
  helper.setPath(input, (path) => path + ".json")
  helper.setQuery(input, (query) => query + "&debug=1")
  helper.setBody(input, "hello")
  helper.addQueryParameter(input, "debug=1")
  helper.addHeader(input, "X-Forwarded-For: 127.0.0.1")
  helper.removeHeader(input, "User-Agent")

Readers:
  helper.getMethod(input), helper.getPath(input), helper.getQuery(input),
  helper.getBody(input), helper.hasHeader(input, "Content-Type")

Return a request string or an array of request strings.`;

export const createDraftTemplate = (): Template => ({
  id: "new-template",
  description: "",
  enabled: true,
  modificationScript: `/*\n${scriptHelp}\n*/\n\nreturn helper.setPath(input, (path) => path + "/");\n`,
});

export const defaultTestRequest =
  'POST /admin/users?id=1 HTTP/1.1\r\nHost: example.com\r\nAccept: application/json\r\nContent-Type: application/json\r\n\r\n{"hello": "world"}';
