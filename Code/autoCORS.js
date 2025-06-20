var autoCORS = {
	defaultFetch: window.fetch,
	DefaultXMLHttpRequest: window.XMLHttpRequest,
	applyDefault: () => {

		autoCORS.proxy = autoCORS.proxies.corsProxy;

		autoCORS.onSend(autoCORS.onRequestDefault);
	},
	disable: () => {
		window.XMLHttpRequest = autoCORS.DefaultXMLHttpRequest;
		window.fetch = autoCORS.defaultFetch;
	},
	onRequestDefault: (request) => {
		return autoCORS.proxy != null ? autoCORS.proxy(request) : null;
	},
	onSend: (onRequest, onResponse) => {

		window.XMLHttpRequest = class extends autoCORS.DefaultXMLHttpRequest {

			constructor() {

				super();

				this.request = {
					request: {
						method: "",
						uri: ""
					},
					headers: {

					},
					body: null
				};

				this.sync = false;
			}

			open(method, uri, sync) {

				this.request.request.method = method;
				this.request.request.uri = uri;

				this.sync = sync;
			}

			setRequestHeader(name, value) {
				this.request.headers[name] = value;
			}

			send(body) {

				this.request.body = body;

				this.request = onRequest(this.request);

				let response = onResponse != null ?
					onResponse(this.request) : null;

				if(response != null) {

					Object.defineProperty(this, 'readyState', {
						value: 4,
						writable: true
					});

					Object.defineProperty(this, 'status', {
						value: 200,
						writable: true
					});

					Object.defineProperty(this, 'responseText', {
						value: "" + response,
						writable: true
					});

					if(this.onreadystatechange != null)
						this.onreadystatechange();
				}

				else {
					
					super.open(
						this.request.request.method,
						this.request.request.uri,
						this.sync
					);

					Object.keys(this.request.headers).forEach(key => {
						super.setRequestHeader(key, this.request.headers[key]);
					});

					super.send(this.request.body);
				}
			}
		}

		window.fetch = (uri, options) => {

			options = options != null ? options : { };

			let request = {
				request: {
					method: options.method != null ?
						options.method : "GET", uri: uri
				},
				headers: options.headers,
				body: options.body
			}

			request = onRequest != null ? onRequest(request) : request;

			let response = onResponse != null ? onResponse(request) : null;

			return onResponse == null ?
				autoCORS.defaultFetch(url, options) :
				new Promise(
					(resolve) => {
						resolve({ text: () => { return response; } });
					}
				);
		}
	},
	proxies: {
		corsProxy: (request) => {

			request = JSON.parse(JSON.stringify(request));

			if(request.request.uri.startsWith(
				"https://raw.githubusercontent.com/")) {

				request.request.uri =
					autoCORS.utils.formatGithubURI(
						request.request.uri
					);
			}

			else {
			
				request.request.uri =
					"https://corsproxy.io/?url=" +
						encodeURIComponent(
							request.request.uri
						).split("%20").join("%2520");
			}

			return request;
		}
	},
	proxy: null,
	send: (request, callback) => {

		if(typeof request == "string")
			request = autoCORS.toJSON(request);

		let call = new XMLHttpRequest();
		
		call.open(request.request.method, request.request.uri, callback != null);

		if(request.headers != null) {
			
			let keys = Object.keys(request.headers);

			for(let i = 0; i < keys.length; i++)
				call.setRequestHeader(keys[i], request.headers[keys[i]]);
		}
		
		var response = {
			response: { version: "", status: "" },
			headers: { },
			body: ""
		};
		
		call.onreadystatechange = function() {
		
			if(call.readyState === 4) {

				response.response.status = call.status;

				let headers = call.getAllResponseHeaders().trim();

				if(headers != null) {

					headers = headers.split("\r\n");

					for(let i = 0; i < headers.length; i++) {

						let header = headers[i].split(":");

						if(header.length >= 2)
							response.headers[header[0].trim()] = header[1].trim();

						else
							response.headers[header[0].trim()] = "";
					}
				}
		
				response.body = call.responseText;

				if(callback != null)
					callback(response);
			}
		}
		
		call.send(request.body);
		
		if(callback == null)
			return response;
	},
	toHTTP: (json) => {

		let http = "";

		if(json.request != null) {

			http += json.request.method + " ";
			http += json.request.uri;

			if(json.request.version != null)
				http += " " + json.request.version;
		}

		else {

			if(json.response.version != null)
				http += " " + json.response.version;

			if(json.response.status != null)
				http += " " + json.response.status;

			if(json.response.reason != null)
				http += " " + json.response.reason;
		}

		if(json.headers != null) {

			let keys = Object.keys(json.headers);

			for(let i = 0; i < keys.length; i++)
				http += "\n" + keys[i] + ": " + json.headers[keys[i]];
		}

		if(json.body != null)
			http += "\n\n" + json.body;

		return http;
	},
	toJSON: (http) => {

		let json = { };

		let lines = http.split("\n");
		let definition = lines[0].split(" ");

		if(!definition[0].includes("/")) {

			json.request = {
				method: definition[0],
				uri: definition[1]
			};

			if(definition.length >= 3)
				json.request.version = definition[2];
		}

		else {

			json.response = {
				version: definition[0],
				status: definition[1]
			};

			if(definition.length >= 3) {

				json.response.reason = lines[0].substring(
					definition[0].length + definition[1].length + 2
				);
			}
		}

		for(let i = 1; i < lines.length; i++) {

			if(lines[i].trim() != "") {

				if(json.headers == null)
					json.headers = { };

				let alias = lines[i].substring(0, lines[i].indexOf(":")).trim();
				let value = lines[i].substring(lines[i].indexOf(":") + 1).trim();

				json.headers[alias] = value;
			}

			else {

				json.body = lines.slice(i + 1).join("\n");

				break;
			}
		}

		return json;
	},
	utils: {
		formatGithubURI: (uri) => {

			uri = uri.substring(34);
			let user = uri.substring(0, uri.indexOf("/"));

			uri = uri.substring(uri.indexOf("/") + 1);
			let repo = uri.substring(0, uri.indexOf("/"));

			uri = uri.substring(uri.indexOf("/") + 1);

			return "https://cdn.jsdelivr.net/gh/" +
				user +
				"/" +
				repo +
				"/" +
				uri.substring(uri.indexOf("/") + 1);
		}
	}
};

if(typeof module == "object")
	module.exports = autoCORS;