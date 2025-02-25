"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = require("ioredis");
/**
 * celery key preifx for redis result key
 * @private
 * @constant
 *
 * @type {string}
 */
const keyPrefix = "celery-task-meta-";
/**
 * @exports
 */
class RedisBackend {
    /**
     * Redis backend class
     * @constructor RedisBackend
     * @param {string} url the connection string of redis
     * @param {object} opts the options object for redis connect of ioredis
     */
    constructor(url, opts) {
        this.redis = new ioredis_1.default(url, Object.assign({}, opts));
    }
    /**
     * codes from here: https://github.com/OptimalBits/bull/blob/129c6e108ce67ca343c8532161d06742d92b651c/lib/utils.js#L21-L44
     * @method RedisBackend#isReady
     * @returns {Promise} promises that continues if redis connected.
     */
    isReady() {
        return new Promise((resolve, reject) => {
            if (this.redis.status === "ready") {
                resolve();
            }
            else {
                let handleError; // eslint-disable-line prefer-const
                const handleReady = () => {
                    this.redis.removeListener("error", handleError);
                    resolve();
                };
                handleError = err => {
                    this.redis.removeListener("ready", handleReady);
                    reject(err);
                };
                this.redis.once("ready", handleReady);
                this.redis.once("error", handleError);
            }
        });
    }
    /**
     * @method RedisBackend#disconnect
     * @returns {Promise} promises that continues if redis disconnected.
     */
    disconnect() {
        return this.redis.quit();
    }
    /**
     * @method RedisBackend#storeResult
     * @param {string} taskId
     * @param {*} result
     * @param {string} state
     */
    storeResult(taskId, result, state) {
        return this.set(`${keyPrefix}${taskId}`, JSON.stringify({
            status: state,
            result: state == 'FAILURE' ? null : result,
            traceback: result,
            children: [],
            task_id: taskId,
            date_done: new Date().toISOString()
        }));
    }
    /**
     * @method RedisBackend#getTaskMeta
     * @param {string} taskId
     * @returns {Promise}
     */
    getTaskMeta(taskId) {
        return this.get(`${keyPrefix}${taskId}`).then(msg => JSON.parse(msg));
    }
    /**
     * @method RedisBackend#set
     * @private
     * @param {String} key
     * @param {String} value
     * @returns {Promise}
     */
    set(key, value) {
        return Promise.all([
            this.redis.setex(key, 86400, value),
            this.redis.publish(key, value) // publish command for subscribe
        ]);
    }
    /**
     * @method RedisBackend#get
     * @private
     * @param {string} key
     * @return {Promise}
     */
    get(key) {
        return this.redis.get(key);
    }
}
exports.default = RedisBackend;
