# AutoCORS

## 1 - Abstract

***You Shall Pass!***

AutoCORS is a set of conventions and associated utilities which enable in-browser HTTP requests to
be automatically routed through CORS proxies.

## 2 - Contents

### 2.1 - Conventions

#### 2.1.1 - HTTP JSON

HTTP JSON is a JSON object format for representing HTTP requests and responses.

An HTTP JSON object shall have a "request" field if representing a request, and a "response" field
if representing a response. Either type may optionally have a "headers" field and a "body" field.

The request field shall contain an object which shall have the string fields "method", specifying
the HTTP method of the request "uri", specifying the URI or URL of the request, and, optionally,
"version", specifying the version of the request.

The response field shall contain an object which shall have the string fields "version", specifying
the HTTP version of the response, "status", specifying the status code of the response, and
"reason", specifying the reason for said status code.

The headers field, if present, contains an object where each field's alias defines the alias of an
HTTP header, and the corresponding value is a string specifying the value of said header.

The body field, if present, contains a string specifying the body of the HTTP request or response.

##### 2.1.1.1 - HTTP JSON Examples

An HTTP JSON GET request to example.com:

    { "request": { "method: "GET", uri: "https://example.com/" } }

An HTTP JSON POST request to example.com:

    {
    	"request": { "method: "POST", uri: "https://example.com/" },
    	"headers": {
    		"Host": "example.com",
    		"Content-Type": "application/x-www-form-urlencoded",
    		"Content-Length": "27"
    	},
    	"body": "field1=value1\nfield2=value2"
    }

### 2.2 - Usage

AutoCORS may be used on any page via the AutoCORS script.

Once included,  sthe scripehall place an object with the alias "autoCORS" into the global namespace
of the page.

The default functionality of AutoCORS can be activated by running:

    autoCORS.applyDefault();

This will modify the XMLHttpRequest and fetch APIs to automatically route all requests through a
CORS proxy.

Manual customization of the behavior of AutoCORS is possible, though it requires an understanding
of HTTP JSON.

#### 2.2.1 - Script CDN

The AutoCORS script can be included in your website from the following CDN link:

    [link]

#### 2.2.2 - Supported Proxies

The AutoCORS script makes use of [https://corsproxy.io/](https://corsproxy.io/) by default.