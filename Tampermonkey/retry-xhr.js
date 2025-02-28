// ==UserScript==
// @name         XHR & Fetch Auto Retry (Instant Retry)
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  立即重试失败的 XHR & Fetch 请求（最多 3 次）
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log("[Tampermonkey] XHR & Fetch 自动重试（无等待）已启用");

    // ======================== XHR 拦截 ========================
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
        this._retryCount = 0; // 记录当前请求的重试次数
        this._maxRetries = 5; // 最大重试次数
        this._method = method;
        this._url = url;
        this._async = async;
        this._user = user;
        this._password = password;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        this._args = args;

        const retryRequest = () => {
            if (this._retryCount < this._maxRetries) {
                this._retryCount++;
                console.warn(`[XHR Retry] 立即重试 ${this._retryCount}/${this._maxRetries}: ${this._url}`);
                this.open(this._method, this._url, this._async, this._user, this._password);
                originalSend.apply(this, this._args);
            }
        };

        this.addEventListener('load', function() {
            if (this.status >= 500) retryRequest();
        });

        this.addEventListener('error', function() {
            retryRequest();
        });

        return originalSend.apply(this, args);
    };

    // ======================== Fetch 拦截 ========================
    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
        let retries = 5;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await originalFetch(url, options);
                if (response.status >= 500) throw new Error(`状态码 ${response.status}，立即重试 ${i + 1}/${retries}`);
                return response;
            } catch (error) {
                console.warn(`[Fetch Retry] ${error.message}`);
                if (i === retries - 1) throw error;
            }
        }
    };
})();
