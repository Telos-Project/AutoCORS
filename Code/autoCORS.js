var autoCORS = {
	applyDefault: () => {

		autoCORS.proxy = autoCORS.utils.proxies.corsProxy;

		autoCORS.onSend(autoCORS.onRequestDefault);
	},
	defaultFetch: typeof window != "undefined" ? window.fetch : null,
	DefaultXMLHttpRequest: typeof window != "undefined" ?
		window.XMLHttpRequest : null,
	getPlatform: () => {

		if(typeof process === 'object') {

			if(typeof process.versions === 'object') {

				if(typeof process.versions.node !== 'undefined') {
					return "node";
				}
			}
		}

		return "browser";
	},
	disable: () => {
		window.XMLHttpRequest = autoCORS.DefaultXMLHttpRequest;
		window.fetch = autoCORS.defaultFetch;
	},
	input: (text) => {

		return autoCORS.getPlatform() == "browser" ?
			prompt(text) : require("readline-sync").question(text);
	},
	load: (request, callback, options) => {

		options = options != null ? options : { };
		options.timeout = options.timeout != null ? options.timeout : 10;

		let response = null;
		let status = null;

		let flag = false;

		try {

			response = autoCORS.send(request);

			status = response.response.status;
		}

		catch(error) {
			flag = true;
		}

		if(!flag && status == 200)
			callback(response.body);

		else {

			setTimeout(() => {
				autoCORS.load(request, callback, options);
			}, 1000 * options.timeout);
		}
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
	proxy: null,
	read: (path, callback) => {

		if(typeof path == "function") {

			let input = document.createElement("input");
	
			input.setAttribute("type", "file");
			input.setAttribute("style", "display: none");
	
			let listener = function(event) {
	
				let upload = event.target.files[0];
	
				if(!upload)
					return;
				
				let reader = new FileReader();
	
				reader.onload = function(event) {
					path(event.target.result, upload.name);
				};
	
				reader.readAsText(upload);
			}
	
			input.addEventListener(
				'change',
				listener,
				false
			);
	
			document.documentElement.appendChild(input);
	
			input.click();
	
			document.documentElement.removeChild(input);

			return;
		}

		if(autoCORS.getPlatform() == "browser" ||
			path.startsWith("http://") ||
			path.startsWith("https://")) {

			let response = autoCORS.send(
				{ request: { method: "GET", uri: path } },
				callback != null ?
					(response) => { callback(response.body); } : null
			);

			return callback != null ? null : response.body;
		}

		return callback != null ?
			require("fs").readFile(path, "utf-8", callback) :
			require("fs").readFileSync(path, "utf-8");
	},
	send: (request, callback) => {

		if(typeof request == "string") {

			request =
				request.startsWith("http://") ||
				request.startsWith("https://") ?
					{
						request: { method: "GET", uri: request }
					} :
					autoCORS.toJSON(request);
		}

		let call = autoCORS.getPlatform() == "browser" ?
			new XMLHttpRequest() :
			new (require("xmlhttprequest").XMLHttpRequest)();
		
		call.open(
			request.request.method, request.request.uri, callback != null
		);

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

						if(header.length >= 2) {

							response.headers[header[0].trim()] =
								header[1].trim();
						}

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

				let alias =
					lines[i].substring(0, lines[i].indexOf(":")).trim();

				let value =
					lines[i].substring(lines[i].indexOf(":") + 1).trim();

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
		checkWhitelist: (uri) => {

			return autoCORS.utils.whitelist.filter(
				item => item.endsWith("/") ?
					uri.toLowerCase().startsWith(item.toLowerCase()) :
					uri.toLowerCase() == item.toLowerCase()
			).length == 0;
		},
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
		},
		proxies: {
			corsProxy: (request) => {

				if(!autoCORS.utils.checkWhitelist(request.request.uri))
					return request;

				request = JSON.parse(JSON.stringify(request));

				if(request.request.uri.startsWith(
					"https://raw.githubusercontent.com/")) {

					request.request.uri =
						autoCORS.utils.formatGithubURI(
							request.request.uri
						);
				}

				else {

					if(request.request.method.toUpperCase() == "GET") {
					
						request.request.uri =
							"https://api.codetabs.com/v1/proxy/?quest=" +
							request.request.uri;
					}

					else {
				
						request.request.uri =
							"https://api.cors.lol/?url=" + request.request.uri;
					}
				}

				return request;
			}
		},
		whitelist: [
			"http://127.0.0.1",
			"https://127.0.0.1",
			"http://localhost",
			"https://localhost",
			"https://cdn.jsdelivr.net/",
			"https://api.cors.lol/"
		]
	},
	write: (path, content, callback) => {

		if(autoCORS.getPlatform() == "browser") {

			if(callback == true) {

				let element = document.createElement('a');
		
				element.setAttribute(
					'href',
					'data:text/plain;charset=utf-8,' +
						encodeURIComponent(content));
			
				if(path != null)
					element.setAttribute('download', path);
			
				element.style.display = 'none';
				document.documentElement.appendChild(element);
			
				element.click();
			
				document.documentElement.removeChild(element);
			}

			// STUB - DOWNLOAD / VIRTUAL SYSTEM

			return;
		}

		if(callback != null)
			require("fs").writeFile(path, content, "utf-8", callback);

		else
			require("fs").writeFileSync(path, content);

		// STUB - FILL IN NON-EXISTENT PATHS
	}
};

if(typeof module == "object")
	module.exports = autoCORS;