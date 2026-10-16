var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@capacitor/core/dist/index.js
var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
var init_dist = __esm({
  "node_modules/@capacitor/core/dist/index.js"() {
    (function(ExceptionCode2) {
      ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
      ExceptionCode2["Unavailable"] = "UNAVAILABLE";
    })(ExceptionCode || (ExceptionCode = {}));
    CapacitorException = class extends Error {
      constructor(message, code, data) {
        super(message);
        this.message = message;
        this.code = code;
        this.data = data;
      }
    };
    getPlatformId = (win) => {
      var _a, _b;
      if (win === null || win === void 0 ? void 0 : win.androidBridge) {
        return "android";
      } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
        return "ios";
      } else {
        return "web";
      }
    };
    createCapacitor = (win) => {
      const capCustomPlatform = win.CapacitorCustomPlatform || null;
      const cap = win.Capacitor || {};
      const Plugins = cap.Plugins = cap.Plugins || {};
      const getPlatform = () => {
        return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
      };
      const isNativePlatform = () => getPlatform() !== "web";
      const isPluginAvailable = (pluginName) => {
        const plugin = registeredPlugins.get(pluginName);
        if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
          return true;
        }
        if (getPluginHeader(pluginName)) {
          return true;
        }
        return false;
      };
      const getPluginHeader = (pluginName) => {
        var _a;
        return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
      };
      const handleError = (err) => win.console.error(err);
      const registeredPlugins = /* @__PURE__ */ new Map();
      const registerPlugin2 = (pluginName, jsImplementations = {}) => {
        const registeredPlugin = registeredPlugins.get(pluginName);
        if (registeredPlugin) {
          console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
          return registeredPlugin.proxy;
        }
        const platform = getPlatform();
        const pluginHeader = getPluginHeader(pluginName);
        let jsImplementation;
        const loadPluginImplementation = async () => {
          if (!jsImplementation && platform in jsImplementations) {
            jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
          } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
            jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
          }
          return jsImplementation;
        };
        const createPluginMethod = (impl, prop) => {
          var _a, _b;
          if (pluginHeader) {
            const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
            if (methodHeader) {
              if (methodHeader.rtype === "promise") {
                return (options) => cap.nativePromise(pluginName, prop.toString(), options);
              } else {
                return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
              }
            } else if (impl) {
              return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
            }
          } else if (impl) {
            return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
          } else {
            throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
          }
        };
        const createPluginMethodWrapper = (prop) => {
          let remove;
          const wrapper = (...args) => {
            const p = loadPluginImplementation().then((impl) => {
              const fn = createPluginMethod(impl, prop);
              if (fn) {
                const p2 = fn(...args);
                remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                return p2;
              } else {
                throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
              }
            });
            if (prop === "addListener") {
              p.remove = async () => remove();
            }
            return p;
          };
          wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
          Object.defineProperty(wrapper, "name", {
            value: prop,
            writable: false,
            configurable: false
          });
          return wrapper;
        };
        const addListener = createPluginMethodWrapper("addListener");
        const removeListener = createPluginMethodWrapper("removeListener");
        const addListenerNative = (eventName, callback) => {
          const call = addListener({ eventName }, callback);
          const remove = async () => {
            const callbackId = await call;
            removeListener({
              eventName,
              callbackId
            }, callback);
          };
          const p = new Promise((resolve) => call.then(() => resolve({ remove })));
          p.remove = async () => {
            console.warn(`Using addListener() without 'await' is deprecated.`);
            await remove();
          };
          return p;
        };
        const proxy = new Proxy({}, {
          get(_, prop) {
            switch (prop) {
              // https://github.com/facebook/react/issues/20030
              case "$$typeof":
                return void 0;
              case "toJSON":
                return () => ({});
              case "addListener":
                return pluginHeader ? addListenerNative : addListener;
              case "removeListener":
                return removeListener;
              default:
                return createPluginMethodWrapper(prop);
            }
          }
        });
        Plugins[pluginName] = proxy;
        registeredPlugins.set(pluginName, {
          name: pluginName,
          proxy,
          platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
        });
        return proxy;
      };
      if (!cap.convertFileSrc) {
        cap.convertFileSrc = (filePath) => filePath;
      }
      cap.getPlatform = getPlatform;
      cap.handleError = handleError;
      cap.isNativePlatform = isNativePlatform;
      cap.isPluginAvailable = isPluginAvailable;
      cap.registerPlugin = registerPlugin2;
      cap.Exception = CapacitorException;
      cap.DEBUG = !!cap.DEBUG;
      cap.isLoggingEnabled = !!cap.isLoggingEnabled;
      return cap;
    };
    initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
    Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
    registerPlugin = Capacitor.registerPlugin;
    WebPlugin = class {
      constructor() {
        this.listeners = {};
        this.retainedEventArguments = {};
        this.windowListeners = {};
      }
      addListener(eventName, listenerFunc) {
        let firstListener = false;
        const listeners = this.listeners[eventName];
        if (!listeners) {
          this.listeners[eventName] = [];
          firstListener = true;
        }
        this.listeners[eventName].push(listenerFunc);
        const windowListener = this.windowListeners[eventName];
        if (windowListener && !windowListener.registered) {
          this.addWindowListener(windowListener);
        }
        if (firstListener) {
          this.sendRetainedArgumentsForEvent(eventName);
        }
        const remove = async () => this.removeListener(eventName, listenerFunc);
        const p = Promise.resolve({ remove });
        return p;
      }
      async removeAllListeners() {
        this.listeners = {};
        for (const listener in this.windowListeners) {
          this.removeWindowListener(this.windowListeners[listener]);
        }
        this.windowListeners = {};
      }
      notifyListeners(eventName, data, retainUntilConsumed) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          if (retainUntilConsumed) {
            let args = this.retainedEventArguments[eventName];
            if (!args) {
              args = [];
            }
            args.push(data);
            this.retainedEventArguments[eventName] = args;
          }
          return;
        }
        listeners.forEach((listener) => listener(data));
      }
      hasListeners(eventName) {
        var _a;
        return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
      }
      registerWindowListener(windowEventName, pluginEventName) {
        this.windowListeners[pluginEventName] = {
          registered: false,
          windowEventName,
          pluginEventName,
          handler: (event) => {
            this.notifyListeners(pluginEventName, event);
          }
        };
      }
      unimplemented(msg = "not implemented") {
        return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
      }
      unavailable(msg = "not available") {
        return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
      }
      async removeListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
          return;
        }
        const index = listeners.indexOf(listenerFunc);
        if (index !== -1) {
          this.listeners[eventName].splice(index, 1);
        }
        if (!this.listeners[eventName].length) {
          this.removeWindowListener(this.windowListeners[eventName]);
        }
      }
      addWindowListener(handle) {
        window.addEventListener(handle.windowEventName, handle.handler);
        handle.registered = true;
      }
      removeWindowListener(handle) {
        if (!handle) {
          return;
        }
        window.removeEventListener(handle.windowEventName, handle.handler);
        handle.registered = false;
      }
      sendRetainedArgumentsForEvent(eventName) {
        const args = this.retainedEventArguments[eventName];
        if (!args) {
          return;
        }
        delete this.retainedEventArguments[eventName];
        args.forEach((arg) => {
          this.notifyListeners(eventName, arg);
        });
      }
    };
    encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
    decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
    CapacitorCookiesPluginWeb = class extends WebPlugin {
      async getCookies() {
        const cookies = document.cookie;
        const cookieMap = {};
        cookies.split(";").forEach((cookie) => {
          if (cookie.length <= 0)
            return;
          let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
          key = decode(key).trim();
          value = decode(value).trim();
          cookieMap[key] = value;
        });
        return cookieMap;
      }
      async setCookie(options) {
        try {
          const encodedKey = encode(options.key);
          const encodedValue = encode(options.value);
          const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
          const path = (options.path || "/").replace("path=", "");
          const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
          document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async deleteCookie(options) {
        try {
          document.cookie = `${options.key}=; Max-Age=0`;
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearCookies() {
        try {
          const cookies = document.cookie.split(";") || [];
          for (const cookie of cookies) {
            document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
          }
        } catch (error) {
          return Promise.reject(error);
        }
      }
      async clearAllCookies() {
        try {
          await this.clearCookies();
        } catch (error) {
          return Promise.reject(error);
        }
      }
    };
    CapacitorCookies = registerPlugin("CapacitorCookies", {
      web: () => new CapacitorCookiesPluginWeb()
    });
    readBlobAsBase64 = async (blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result;
        resolve(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(blob);
    });
    normalizeHttpHeaders = (headers = {}) => {
      const originalKeys = Object.keys(headers);
      const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
      const normalized = loweredKeys.reduce((acc, key, index) => {
        acc[key] = headers[originalKeys[index]];
        return acc;
      }, {});
      return normalized;
    };
    buildUrlParams = (params, shouldEncode = true) => {
      if (!params)
        return null;
      const output = Object.entries(params).reduce((accumulator, entry) => {
        const [key, value] = entry;
        let encodedValue;
        let item;
        if (Array.isArray(value)) {
          item = "";
          value.forEach((str) => {
            encodedValue = shouldEncode ? encodeURIComponent(str) : str;
            item += `${key}=${encodedValue}&`;
          });
          item.slice(0, -1);
        } else {
          encodedValue = shouldEncode ? encodeURIComponent(value) : value;
          item = `${key}=${encodedValue}`;
        }
        return `${accumulator}&${item}`;
      }, "");
      return output.substr(1);
    };
    buildRequestInit = (options, extra = {}) => {
      const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
      const headers = normalizeHttpHeaders(options.headers);
      const type = headers["content-type"] || "";
      if (typeof options.data === "string") {
        output.body = options.data;
      } else if (type.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.data || {})) {
          params.set(key, value);
        }
        output.body = params.toString();
      } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
        const form = new FormData();
        if (options.data instanceof FormData) {
          options.data.forEach((value, key) => {
            form.append(key, value);
          });
        } else {
          for (const key of Object.keys(options.data)) {
            form.append(key, options.data[key]);
          }
        }
        output.body = form;
        const headers2 = new Headers(output.headers);
        headers2.delete("content-type");
        output.headers = headers2;
      } else if (type.includes("application/json") || typeof options.data === "object") {
        output.body = JSON.stringify(options.data);
      }
      return output;
    };
    CapacitorHttpPluginWeb = class extends WebPlugin {
      /**
       * Perform an Http request given a set of options
       * @param options Options to build the HTTP request
       */
      async request(options) {
        const requestInit = buildRequestInit(options, options.webFetchExtra);
        const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
        const url = urlParams ? `${options.url}?${urlParams}` : options.url;
        const response = await fetch(url, requestInit);
        const contentType = response.headers.get("content-type") || "";
        let { responseType = "text" } = response.ok ? options : {};
        if (contentType.includes("application/json")) {
          responseType = "json";
        }
        let data;
        let blob;
        switch (responseType) {
          case "arraybuffer":
          case "blob":
            blob = await response.blob();
            data = await readBlobAsBase64(blob);
            break;
          case "json":
            data = await response.json();
            break;
          case "document":
          case "text":
          default:
            data = await response.text();
        }
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        return {
          data,
          headers,
          status: response.status,
          url: response.url
        };
      }
      /**
       * Perform an Http GET request given a set of options
       * @param options Options to build the HTTP request
       */
      async get(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
      }
      /**
       * Perform an Http POST request given a set of options
       * @param options Options to build the HTTP request
       */
      async post(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
      }
      /**
       * Perform an Http PUT request given a set of options
       * @param options Options to build the HTTP request
       */
      async put(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
      }
      /**
       * Perform an Http PATCH request given a set of options
       * @param options Options to build the HTTP request
       */
      async patch(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
      }
      /**
       * Perform an Http DELETE request given a set of options
       * @param options Options to build the HTTP request
       */
      async delete(options) {
        return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
      }
    };
    CapacitorHttp = registerPlugin("CapacitorHttp", {
      web: () => new CapacitorHttpPluginWeb()
    });
    (function(SystemBarsStyle2) {
      SystemBarsStyle2["Dark"] = "DARK";
      SystemBarsStyle2["Light"] = "LIGHT";
      SystemBarsStyle2["Default"] = "DEFAULT";
    })(SystemBarsStyle || (SystemBarsStyle = {}));
    (function(SystemBarType2) {
      SystemBarType2["StatusBar"] = "StatusBar";
      SystemBarType2["NavigationBar"] = "NavigationBar";
    })(SystemBarType || (SystemBarType = {}));
    SystemBarsPluginWeb = class extends WebPlugin {
      async setStyle() {
        this.unavailable("not available for web");
      }
      async setAnimation() {
        this.unavailable("not available for web");
      }
      async show() {
        this.unavailable("not available for web");
      }
      async hide() {
        this.unavailable("not available for web");
      }
    };
    SystemBars = registerPlugin("SystemBars", {
      web: () => new SystemBarsPluginWeb()
    });
  }
});

// node_modules/@capacitor/app/dist/esm/web.js
var web_exports = {};
__export(web_exports, {
  AppWeb: () => AppWeb
});
var AppWeb;
var init_web = __esm({
  "node_modules/@capacitor/app/dist/esm/web.js"() {
    init_dist();
    AppWeb = class extends WebPlugin {
      constructor() {
        super();
        this.handleVisibilityChange = () => {
          const data = {
            isActive: document.hidden !== true
          };
          this.notifyListeners("appStateChange", data);
          if (document.hidden) {
            this.notifyListeners("pause", null);
          } else {
            this.notifyListeners("resume", null);
          }
        };
        document.addEventListener("visibilitychange", this.handleVisibilityChange, false);
      }
      exitApp() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getInfo() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getLaunchUrl() {
        return { url: "" };
      }
      async getState() {
        return { isActive: document.hidden !== true };
      }
      async minimizeApp() {
        throw this.unimplemented("Not implemented on web.");
      }
      async toggleBackButtonHandler() {
        throw this.unimplemented("Not implemented on web.");
      }
      async getAppLanguage() {
        return {
          value: navigator.language.split("-")[0].toLowerCase()
        };
      }
    };
  }
});

// node_modules/@capacitor/local-notifications/dist/esm/web.js
var web_exports2 = {};
__export(web_exports2, {
  LocalNotificationsWeb: () => LocalNotificationsWeb
});
var LocalNotificationsWeb;
var init_web2 = __esm({
  "node_modules/@capacitor/local-notifications/dist/esm/web.js"() {
    init_dist();
    LocalNotificationsWeb = class extends WebPlugin {
      constructor() {
        super(...arguments);
        this.pending = [];
        this.deliveredNotifications = [];
        this.hasNotificationSupport = () => {
          if (!("Notification" in window) || !Notification.requestPermission) {
            return false;
          }
          if (Notification.permission !== "granted") {
            try {
              new Notification("");
            } catch (e) {
              if (e instanceof Error && e.name === "TypeError") {
                return false;
              }
            }
          }
          return true;
        };
      }
      async getDeliveredNotifications() {
        const deliveredSchemas = [];
        for (const notification of this.deliveredNotifications) {
          const deliveredSchema = {
            title: notification.title,
            id: parseInt(notification.tag),
            body: notification.body
          };
          deliveredSchemas.push(deliveredSchema);
        }
        return {
          notifications: deliveredSchemas
        };
      }
      async removeDeliveredNotifications(delivered) {
        for (const toRemove of delivered.notifications) {
          const found = this.deliveredNotifications.find((n) => n.tag === String(toRemove.id));
          found === null || found === void 0 ? void 0 : found.close();
          this.deliveredNotifications = this.deliveredNotifications.filter(() => !found);
        }
      }
      async removeDeliveredNotificationsById(options) {
        for (const id of options.ids) {
          const found = this.deliveredNotifications.find((n) => n.tag === String(id));
          found === null || found === void 0 ? void 0 : found.close();
          this.deliveredNotifications = this.deliveredNotifications.filter((n) => n !== found);
        }
      }
      async removeAllDeliveredNotifications() {
        for (const notification of this.deliveredNotifications) {
          notification.close();
        }
        this.deliveredNotifications = [];
      }
      async getByIds(options) {
        const ids = options.ids.map((id) => String(id));
        const scheduled = this.pending.filter((n) => ids.includes(String(n.id)));
        const delivered = this.deliveredNotifications.filter((n) => ids.includes(n.tag)).map((n) => this.deliveredToSchema(n));
        return { notifications: [...scheduled, ...delivered] };
      }
      async getAll(options) {
        const scheduled = [...this.pending];
        const delivered = this.deliveredNotifications.map((n) => this.deliveredToSchema(n));
        if ((options === null || options === void 0 ? void 0 : options.state) === "SCHEDULED") {
          return { notifications: scheduled };
        }
        if ((options === null || options === void 0 ? void 0 : options.state) === "TRIGGERED") {
          return { notifications: delivered };
        }
        return { notifications: [...scheduled, ...delivered] };
      }
      deliveredToSchema(notification) {
        return {
          title: notification.title,
          id: parseInt(notification.tag),
          body: notification.body
        };
      }
      async createChannel() {
        throw this.unimplemented("Not implemented on web.");
      }
      async deleteChannel() {
        throw this.unimplemented("Not implemented on web.");
      }
      async listChannels() {
        throw this.unimplemented("Not implemented on web.");
      }
      async schedule(options) {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        for (const notification of options.notifications) {
          this.sendNotification(notification);
        }
        return {
          notifications: options.notifications.map((notification) => ({
            id: notification.id
          }))
        };
      }
      async update(options) {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        const updated = [];
        for (const notification of options.notifications) {
          const index = this.pending.findIndex((n) => n.id === notification.id);
          if (index === -1) {
            continue;
          }
          this.pending.splice(index, 1);
          this.sendNotification(notification);
          updated.push(notification);
        }
        return {
          notifications: updated.map((notification) => ({ id: notification.id }))
        };
      }
      async getPending() {
        return {
          notifications: this.pending
        };
      }
      async cancelAll() {
        this.pending = [];
      }
      async registerActionTypes() {
        throw this.unimplemented("Not implemented on web.");
      }
      async cancel(pending) {
        this.pending = this.pending.filter((notification) => !pending.notifications.find((n) => n.id === notification.id));
      }
      async areEnabled() {
        const { display } = await this.checkPermissions();
        return {
          value: display === "granted"
        };
      }
      async changeExactNotificationSetting() {
        throw this.unimplemented("Not implemented on web.");
      }
      async checkExactNotificationSetting() {
        throw this.unimplemented("Not implemented on web.");
      }
      async requestPermissions() {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        const display = this.transformNotificationPermission(await Notification.requestPermission());
        return { display };
      }
      async checkPermissions() {
        if (!this.hasNotificationSupport()) {
          throw this.unavailable("Notifications not supported in this browser.");
        }
        const display = this.transformNotificationPermission(Notification.permission);
        return { display };
      }
      transformNotificationPermission(permission) {
        switch (permission) {
          case "granted":
            return "granted";
          case "denied":
            return "denied";
          default:
            return "prompt";
        }
      }
      sendPending() {
        var _a;
        const toRemove = [];
        const now = (/* @__PURE__ */ new Date()).getTime();
        for (const notification of this.pending) {
          if (((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) && notification.schedule.at.getTime() <= now) {
            this.buildNotification(notification);
            toRemove.push(notification);
          }
        }
        this.pending = this.pending.filter((notification) => !toRemove.find((n) => n === notification));
      }
      sendNotification(notification) {
        var _a;
        if ((_a = notification.schedule) === null || _a === void 0 ? void 0 : _a.at) {
          const diff = notification.schedule.at.getTime() - (/* @__PURE__ */ new Date()).getTime();
          this.pending.push(notification);
          setTimeout(() => {
            this.sendPending();
          }, diff);
          return;
        }
        this.buildNotification(notification);
      }
      buildNotification(notification) {
        const localNotification = new Notification(notification.title, {
          body: notification.body,
          tag: String(notification.id)
        });
        localNotification.addEventListener("click", this.onClick.bind(this, notification), false);
        localNotification.addEventListener("show", this.onShow.bind(this, notification), false);
        localNotification.addEventListener("close", () => {
          this.deliveredNotifications = this.deliveredNotifications.filter(() => !this);
        }, false);
        this.deliveredNotifications.push(localNotification);
        return localNotification;
      }
      onClick(notification) {
        const data = {
          actionId: "tap",
          notification
        };
        this.notifyListeners("localNotificationActionPerformed", data);
      }
      onShow(notification) {
        this.notifyListeners("localNotificationReceived", notification);
      }
    };
  }
});

// node_modules/@capacitor-community/admob/dist/esm/consent/consent-status.enum.js
var AdmobConsentStatus;
var init_consent_status_enum = __esm({
  "node_modules/@capacitor-community/admob/dist/esm/consent/consent-status.enum.js"() {
    (function(AdmobConsentStatus2) {
      AdmobConsentStatus2["NOT_REQUIRED"] = "NOT_REQUIRED";
      AdmobConsentStatus2["OBTAINED"] = "OBTAINED";
      AdmobConsentStatus2["REQUIRED"] = "REQUIRED";
      AdmobConsentStatus2["UNKNOWN"] = "UNKNOWN";
    })(AdmobConsentStatus || (AdmobConsentStatus = {}));
  }
});

// node_modules/@capacitor-community/admob/dist/esm/consent/privacy-options-requirement-status.enum.js
var PrivacyOptionsRequirementStatus;
var init_privacy_options_requirement_status_enum = __esm({
  "node_modules/@capacitor-community/admob/dist/esm/consent/privacy-options-requirement-status.enum.js"() {
    (function(PrivacyOptionsRequirementStatus2) {
      PrivacyOptionsRequirementStatus2["NOT_REQUIRED"] = "NOT_REQUIRED";
      PrivacyOptionsRequirementStatus2["REQUIRED"] = "REQUIRED";
      PrivacyOptionsRequirementStatus2["UNKNOWN"] = "UNKNOWN";
    })(PrivacyOptionsRequirementStatus || (PrivacyOptionsRequirementStatus = {}));
  }
});

// node_modules/@capacitor-community/admob/dist/esm/web.js
var web_exports3 = {};
__export(web_exports3, {
  AdMobWeb: () => AdMobWeb
});
var AdMobWeb;
var init_web3 = __esm({
  "node_modules/@capacitor-community/admob/dist/esm/web.js"() {
    init_dist();
    init_consent_status_enum();
    init_privacy_options_requirement_status_enum();
    AdMobWeb = class extends WebPlugin {
      async initialize() {
        console.log("initialize");
      }
      async requestTrackingAuthorization() {
        console.log("requestTrackingAuthorization");
      }
      async trackingAuthorizationStatus() {
        return {
          status: "authorized"
        };
      }
      async requestConsentInfo(options) {
        console.log("requestConsentInfo", options);
        return {
          status: AdmobConsentStatus.REQUIRED,
          isConsentFormAvailable: true,
          canRequestAds: true,
          privacyOptionsRequirementStatus: PrivacyOptionsRequirementStatus.REQUIRED
        };
      }
      async showPrivacyOptionsForm() {
        console.log("showPrivacyOptionsForm");
      }
      async showConsentForm() {
        console.log("showConsentForm");
        return {
          status: AdmobConsentStatus.REQUIRED,
          canRequestAds: true,
          privacyOptionsRequirementStatus: PrivacyOptionsRequirementStatus.REQUIRED
        };
      }
      async resetConsentInfo() {
        console.log("resetConsentInfo");
      }
      async setApplicationMuted(options) {
        console.log("setApplicationMuted", options);
      }
      async setApplicationVolume(options) {
        console.log("setApplicationVolume", options);
      }
      async showBanner(options) {
        console.log("showBanner", options);
      }
      async hideBanner() {
        console.log("hideBanner");
      }
      async resumeBanner() {
        console.log("resumeBanner");
      }
      async removeBanner() {
        console.log("removeBanner");
      }
      async startNativeAdFeed() {
        throw new Error("Native ads are only available on iOS and Android");
      }
      async destroyNativeAdFeed(options) {
        console.log("destroyNativeAdFeed", options);
      }
      async loadNativeAd() {
        throw new Error("Native ads are only available on iOS and Android");
      }
      async updateNativeAdPlacements(options) {
        console.log("updateNativeAdPlacements", options);
      }
      async removeNativeAd(options) {
        console.log("removeNativeAd", options);
      }
      async prepareInterstitial(options) {
        console.log("prepareInterstitial", options);
        return {
          adUnitId: options.adId
        };
      }
      async showInterstitial(options) {
        console.log("showInterstitial", options);
      }
      async prepareRewardVideoAd(options) {
        console.log("prepareRewardVideoAd", options);
        return {
          adUnitId: options.adId
        };
      }
      async showRewardVideoAd(options) {
        console.log("showRewardVideoAd", options);
        return {
          type: "",
          amount: 0
        };
      }
      async prepareRewardInterstitialAd(options) {
        console.log("prepareRewardInterstitialAd", options);
        return {
          adUnitId: options.adId
        };
      }
      async showRewardInterstitialAd(options) {
        console.log("showRewardInterstitialAd", options);
        return {
          type: "",
          amount: 0
        };
      }
      async loadAppOpen(options) {
        console.log("loadAppOpen", options);
        return {
          adUnitId: options.adId
        };
      }
      async showAppOpen(options) {
        console.log("showAppOpen", options);
      }
      async isAppOpenLoaded() {
        return { value: false };
      }
      addListener(eventName, listenerFunc) {
        void listenerFunc;
        console.log("addListener", eventName);
        return Promise.resolve({ remove: () => Promise.resolve() });
      }
    };
  }
});

// src/native-shell.js
init_dist();

// node_modules/@capacitor/app/dist/esm/index.js
init_dist();
var App = registerPlugin("App", {
  web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.AppWeb())
});

// node_modules/@capacitor/local-notifications/dist/esm/index.js
init_dist();

// node_modules/@capacitor/local-notifications/dist/esm/definitions.js
var Weekday;
(function(Weekday2) {
  Weekday2[Weekday2["Sunday"] = 1] = "Sunday";
  Weekday2[Weekday2["Monday"] = 2] = "Monday";
  Weekday2[Weekday2["Tuesday"] = 3] = "Tuesday";
  Weekday2[Weekday2["Wednesday"] = 4] = "Wednesday";
  Weekday2[Weekday2["Thursday"] = 5] = "Thursday";
  Weekday2[Weekday2["Friday"] = 6] = "Friday";
  Weekday2[Weekday2["Saturday"] = 7] = "Saturday";
})(Weekday || (Weekday = {}));

// node_modules/@capacitor/local-notifications/dist/esm/index.js
var LocalNotifications = registerPlugin("LocalNotifications", {
  web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.LocalNotificationsWeb())
});

// node_modules/@capacitor-community/admob/dist/esm/index.js
init_dist();

// node_modules/@capacitor-community/admob/dist/esm/native-ads/native-ad-feed.js
init_dist();

// node_modules/@capacitor-community/admob/dist/esm/native-ads/native-ad-template.enum.js
var NativeAdTemplate;
(function(NativeAdTemplate2) {
  NativeAdTemplate2["Small"] = "small";
  NativeAdTemplate2["Medium"] = "medium";
})(NativeAdTemplate || (NativeAdTemplate = {}));

// node_modules/@capacitor-community/admob/dist/esm/native-ads/native-ad-feed.js
var bridge;
var configureNativeAdBridge = (adMobBridge) => {
  bridge = adMobBridge;
};

// node_modules/@capacitor-community/admob/dist/esm/definitions.js
var MaxAdContentRating;
(function(MaxAdContentRating2) {
  MaxAdContentRating2["General"] = "General";
  MaxAdContentRating2["ParentalGuidance"] = "ParentalGuidance";
  MaxAdContentRating2["Teen"] = "Teen";
  MaxAdContentRating2["MatureAudience"] = "MatureAudience";
})(MaxAdContentRating || (MaxAdContentRating = {}));

// node_modules/@capacitor-community/admob/dist/esm/banner/banner-ad-plugin-events.enum.js
var BannerAdPluginEvents;
(function(BannerAdPluginEvents2) {
  BannerAdPluginEvents2["SizeChanged"] = "bannerAdSizeChanged";
  BannerAdPluginEvents2["Loaded"] = "bannerAdLoaded";
  BannerAdPluginEvents2["FailedToLoad"] = "bannerAdFailedToLoad";
  BannerAdPluginEvents2["Opened"] = "bannerAdOpened";
  BannerAdPluginEvents2["Closed"] = "bannerAdClosed";
  BannerAdPluginEvents2["AdImpression"] = "bannerAdImpression";
  BannerAdPluginEvents2["AdPaid"] = "bannerAdPaid";
})(BannerAdPluginEvents || (BannerAdPluginEvents = {}));

// node_modules/@capacitor-community/admob/dist/esm/banner/banner-ad-position.enum.js
var BannerAdPosition;
(function(BannerAdPosition2) {
  BannerAdPosition2["TOP_CENTER"] = "TOP_CENTER";
  BannerAdPosition2["CENTER"] = "CENTER";
  BannerAdPosition2["BOTTOM_CENTER"] = "BOTTOM_CENTER";
})(BannerAdPosition || (BannerAdPosition = {}));

// node_modules/@capacitor-community/admob/dist/esm/banner/banner-ad-size.enum.js
var BannerAdSize;
(function(BannerAdSize2) {
  BannerAdSize2["BANNER"] = "BANNER";
  BannerAdSize2["FULL_BANNER"] = "FULL_BANNER";
  BannerAdSize2["LARGE_BANNER"] = "LARGE_BANNER";
  BannerAdSize2["MEDIUM_RECTANGLE"] = "MEDIUM_RECTANGLE";
  BannerAdSize2["LEADERBOARD"] = "LEADERBOARD";
  BannerAdSize2["ADAPTIVE_BANNER"] = "ADAPTIVE_BANNER";
  BannerAdSize2["SMART_BANNER"] = "SMART_BANNER";
})(BannerAdSize || (BannerAdSize = {}));

// node_modules/@capacitor-community/admob/dist/esm/interstitial/interstitial-ad-plugin-events.enum.js
var InterstitialAdPluginEvents;
(function(InterstitialAdPluginEvents2) {
  InterstitialAdPluginEvents2["Loaded"] = "interstitialAdLoaded";
  InterstitialAdPluginEvents2["FailedToLoad"] = "interstitialAdFailedToLoad";
  InterstitialAdPluginEvents2["Showed"] = "interstitialAdShowed";
  InterstitialAdPluginEvents2["FailedToShow"] = "interstitialAdFailedToShow";
  InterstitialAdPluginEvents2["Dismissed"] = "interstitialAdDismissed";
  InterstitialAdPluginEvents2["AdImpression"] = "interstitialAdImpression";
})(InterstitialAdPluginEvents || (InterstitialAdPluginEvents = {}));

// node_modules/@capacitor-community/admob/dist/esm/reward-interstitial/reward-interstitial-ad-plugin-events.enum.js
var RewardInterstitialAdPluginEvents;
(function(RewardInterstitialAdPluginEvents2) {
  RewardInterstitialAdPluginEvents2["Loaded"] = "onRewardedInterstitialAdLoaded";
  RewardInterstitialAdPluginEvents2["FailedToLoad"] = "onRewardedInterstitialAdFailedToLoad";
  RewardInterstitialAdPluginEvents2["Showed"] = "onRewardedInterstitialAdShowed";
  RewardInterstitialAdPluginEvents2["FailedToShow"] = "onRewardedInterstitialAdFailedToShow";
  RewardInterstitialAdPluginEvents2["Dismissed"] = "onRewardedInterstitialAdDismissed";
  RewardInterstitialAdPluginEvents2["Rewarded"] = "onRewardedInterstitialAdReward";
  RewardInterstitialAdPluginEvents2["AdImpression"] = "onRewardedInterstitialAdImpression";
})(RewardInterstitialAdPluginEvents || (RewardInterstitialAdPluginEvents = {}));

// node_modules/@capacitor-community/admob/dist/esm/reward/reward-ad-plugin-events.enum.js
var RewardAdPluginEvents;
(function(RewardAdPluginEvents2) {
  RewardAdPluginEvents2["adClicked"] = "onRewardedVideoAdClicked";
  RewardAdPluginEvents2["Loaded"] = "onRewardedVideoAdLoaded";
  RewardAdPluginEvents2["FailedToLoad"] = "onRewardedVideoAdFailedToLoad";
  RewardAdPluginEvents2["Showed"] = "onRewardedVideoAdShowed";
  RewardAdPluginEvents2["FailedToShow"] = "onRewardedVideoAdFailedToShow";
  RewardAdPluginEvents2["Dismissed"] = "onRewardedVideoAdDismissed";
  RewardAdPluginEvents2["Rewarded"] = "onRewardedVideoAdReward";
  RewardAdPluginEvents2["AdImpression"] = "onRewardedVideoAdImpression";
})(RewardAdPluginEvents || (RewardAdPluginEvents = {}));

// node_modules/@capacitor-community/admob/dist/esm/consent/index.js
init_consent_status_enum();

// node_modules/@capacitor-community/admob/dist/esm/consent/consent-debug-geography.enum.js
var AdmobConsentDebugGeography;
(function(AdmobConsentDebugGeography2) {
  AdmobConsentDebugGeography2[AdmobConsentDebugGeography2["DISABLED"] = 0] = "DISABLED";
  AdmobConsentDebugGeography2[AdmobConsentDebugGeography2["EEA"] = 1] = "EEA";
  AdmobConsentDebugGeography2[AdmobConsentDebugGeography2["NOT_EEA"] = 2] = "NOT_EEA";
  AdmobConsentDebugGeography2[AdmobConsentDebugGeography2["US"] = 3] = "US";
  AdmobConsentDebugGeography2[AdmobConsentDebugGeography2["OTHER"] = 4] = "OTHER";
})(AdmobConsentDebugGeography || (AdmobConsentDebugGeography = {}));

// node_modules/@capacitor-community/admob/dist/esm/shared/ad-mob-revenue-data.interface.js
var AdValuePrecision;
(function(AdValuePrecision2) {
  AdValuePrecision2[AdValuePrecision2["Unknown"] = 0] = "Unknown";
  AdValuePrecision2[AdValuePrecision2["Estimated"] = 1] = "Estimated";
  AdValuePrecision2[AdValuePrecision2["PublisherProvided"] = 2] = "PublisherProvided";
  AdValuePrecision2[AdValuePrecision2["Precise"] = 3] = "Precise";
})(AdValuePrecision || (AdValuePrecision = {}));

// node_modules/@capacitor-community/admob/dist/esm/app-open/app-open-ad-plugin-events.enum.js
var AppOpenAdPluginEvents;
(function(AppOpenAdPluginEvents2) {
  AppOpenAdPluginEvents2["Loaded"] = "appOpenAdLoaded";
  AppOpenAdPluginEvents2["FailedToLoad"] = "appOpenAdFailedToLoad";
  AppOpenAdPluginEvents2["Opened"] = "appOpenAdOpened";
  AppOpenAdPluginEvents2["Closed"] = "appOpenAdClosed";
  AppOpenAdPluginEvents2["FailedToShow"] = "appOpenAdFailedToShow";
  AppOpenAdPluginEvents2["AdImpression"] = "appOpenAdImpression";
})(AppOpenAdPluginEvents || (AppOpenAdPluginEvents = {}));

// node_modules/@capacitor-community/admob/dist/esm/native-ads/native-ad-plugin-events.enum.js
var NativeAdPluginEvents;
(function(NativeAdPluginEvents2) {
  NativeAdPluginEvents2["Loaded"] = "nativeAdLoaded";
  NativeAdPluginEvents2["FailedToLoad"] = "nativeAdFailedToLoad";
  NativeAdPluginEvents2["Clicked"] = "nativeAdClicked";
  NativeAdPluginEvents2["AdImpression"] = "nativeAdImpression";
  NativeAdPluginEvents2["Opened"] = "nativeAdOpened";
  NativeAdPluginEvents2["Closed"] = "nativeAdClosed";
  NativeAdPluginEvents2["AdPaid"] = "nativeAdPaid";
})(NativeAdPluginEvents || (NativeAdPluginEvents = {}));

// node_modules/@capacitor-community/admob/dist/esm/index.js
var nativeAdBridge = registerPlugin("AdMob", {
  web: () => Promise.resolve().then(() => (init_web3(), web_exports3)).then((m) => new m.AdMobWeb())
});
var AdMob = nativeAdBridge;
configureNativeAdBridge(nativeAdBridge);

// admob.config.json
var admob_config_default = {
  useTestAds: true,
  comment: "useTestAds must stay true until a real AdMob account is allowed to serve ads for this app. Test IDs are Google's public demo IDs. They do not earn money. To switch later, set useTestAds to false, fill production, and put the same application IDs in android/app/src/main/res/values/strings.xml (admob_app_id) and ios/App/App/Info.plist (GADApplicationIdentifier). Do that only after reading the AdMob and Play gambling policies. This file alone does not make the app store-ready.",
  test: {
    androidAppId: "ca-app-pub-3940256099942544~3347511713",
    iosAppId: "ca-app-pub-3940256099942544~1458002511",
    androidBannerId: "ca-app-pub-3940256099942544/6300978111",
    iosBannerId: "ca-app-pub-3940256099942544/2934735716"
  },
  production: {
    androidAppId: "",
    iosAppId: "",
    androidBannerId: "",
    iosBannerId: ""
  }
};

// src/native-shell.js
var ALERT_KEY = "lotterymigo_draw_alerts";
var NOTIFIED_KEY = "lotterymigo_last_notified";
var CHANNEL_ID = "new-draws";
var adsAllowed = false;
var bannerShown = false;
function bannerUnitId() {
  const block = admob_config_default.useTestAds ? admob_config_default.test : admob_config_default.production;
  const id = Capacitor.getPlatform() === "ios" ? block.iosBannerId : block.androidBannerId;
  return id || "";
}
function scratchResultOpen() {
  const result = document.getElementById("scratch-result");
  return !!(result && !result.classList.contains("hidden"));
}
function setBannerPadding(px) {
  document.body.style.paddingBottom = px > 0 ? px + "px" : "";
}
async function hideBannerForScratch() {
  if (!bannerShown) {
    setBannerPadding(0);
    return;
  }
  try {
    await AdMob.hideBanner();
  } catch (err) {
    console.warn("Could not hide the banner.", err);
  }
  bannerShown = false;
  setBannerPadding(0);
}
async function syncBanner() {
  if (!adsAllowed) return;
  if (scratchResultOpen()) {
    await hideBannerForScratch();
    return;
  }
  const adId = bannerUnitId();
  if (!adId) {
    console.warn("AdMob banner id is empty. Ads stay off until admob.config.json has an id.");
    return;
  }
  if (bannerShown) return;
  await AdMob.showBanner({
    adId,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0
  });
  bannerShown = true;
}
async function setupAds() {
  const adId = bannerUnitId();
  if (!admob_config_default.useTestAds && !adId) return;
  let consentInfo = await AdMob.requestConsentInfo();
  if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
    consentInfo = await AdMob.showConsentForm();
  }
  if (!consentInfo.canRequestAds) {
    console.info("Ad consent does not allow ads. No banner will be shown.");
    return;
  }
  await AdMob.initialize({
    initializeForTesting: !!admob_config_default.useTestAds
  });
  await AdMob.addListener(BannerAdPluginEvents.SizeChanged, (info) => {
    if (!bannerShown || scratchResultOpen()) return;
    const height = Number(info && (info.height || info.adHeight)) || 0;
    if (height > 0) setBannerPadding(height + 8);
  });
  const result = document.getElementById("scratch-result");
  if (result) {
    const observer = new MutationObserver(() => {
      syncBanner().catch((err) => console.warn("Banner update failed.", err));
    });
    observer.observe(result, { attributes: true, attributeFilter: ["class"] });
  }
  adsAllowed = true;
  await syncBanner();
}
function snapshot() {
  if (typeof window.lmGetDrawAlertSnapshot !== "function") return null;
  return window.lmGetDrawAlertSnapshot();
}
function readNotified() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "{}");
  } catch (err) {
    return {};
  }
}
function writeNotified(snap) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify({
    powerball: snap.powerball || "",
    megamillions: snap.megamillions || ""
  }));
}
async function ensureChannel() {
  if (Capacitor.getPlatform() !== "android") return;
  await LocalNotifications.createChannel({
    id: CHANNEL_ID,
    name: "New drawings",
    description: "A notice when the draw list has a newer date. Not a prediction.",
    importance: 3,
    visibility: 1
  });
}
async function maybeNotify() {
  if (localStorage.getItem(ALERT_KEY) !== "on") return;
  const snap = snapshot();
  if (!snap || snap.source === "sample") return;
  const previous = readNotified();
  const parts = [];
  if (snap.powerball && snap.powerball !== previous.powerball) parts.push("Powerball " + snap.powerball);
  if (snap.megamillions && snap.megamillions !== previous.megamillions) parts.push("Mega Millions " + snap.megamillions);
  if (!parts.length) return;
  if (!previous.powerball && !previous.megamillions) {
    writeNotified(snap);
    return;
  }
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== "granted") return;
  await LocalNotifications.schedule({
    notifications: [{
      id: 24001,
      channelId: CHANNEL_ID,
      title: "A newer drawing is listed",
      body: parts.join(" and ") + ". This is not a prediction.",
      schedule: { at: new Date(Date.now() + 800), allowWhileIdle: true }
    }]
  });
  writeNotified(snap);
}
function setAlertButton(on) {
  const button = document.getElementById("btn-draw-alerts");
  const copy = document.getElementById("draw-alert-copy");
  if (button) {
    button.classList.remove("hidden");
    button.textContent = on ? "Turn off draw alerts" : "Turn on draw alerts";
    button.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (copy) {
    copy.textContent = on ? "Draw alerts are on for this device. You will be notified only when a newer drawing date shows up. An alert is not a prediction." : "Turn on draw alerts if you want a notice when a newer drawing is in the list. Nothing is sent until you turn this on. An alert is not a prediction.";
  }
}
async function setupAlerts() {
  const button = document.getElementById("btn-draw-alerts");
  setAlertButton(localStorage.getItem(ALERT_KEY) === "on");
  if (!button || button.dataset.bound === "yes") return;
  button.dataset.bound = "yes";
  button.addEventListener("click", async () => {
    if (localStorage.getItem(ALERT_KEY) === "on") {
      localStorage.setItem(ALERT_KEY, "off");
      setAlertButton(false);
      return;
    }
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") {
      const copy = document.getElementById("draw-alert-copy");
      if (copy) copy.textContent = "Notifications are blocked for this app. You can allow them in the phone settings. No alert was turned on.";
      return;
    }
    await ensureChannel();
    localStorage.setItem(ALERT_KEY, "on");
    const snap = snapshot();
    if (snap) writeNotified(snap);
    setAlertButton(true);
  });
}
async function bootNative() {
  if (!Capacitor.isNativePlatform()) return;
  await setupAlerts();
  document.addEventListener("lm-draws-ready", () => {
    maybeNotify().catch((err) => console.warn("Draw alert failed.", err));
  });
  await App.addListener("appStateChange", (state) => {
    if (!state.isActive || typeof window.lmReloadDraws !== "function") return;
    window.lmReloadDraws();
  });
  try {
    await setupAds();
  } catch (err) {
    console.warn("Ads did not start.", err);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  bootNative().catch((err) => console.warn("Native shell failed.", err));
});
