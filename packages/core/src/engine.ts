import { AsyncHook, HookMap, SyncHook } from "tapable";
import set from 'lodash.set';
import get from 'lodash.get'
import FormPlugin from "./plugin";

type BlankVoidFunction = () => void;

export type Name = string | number | Array<string | number>;

export type FieldData = { name: Name, value?: any }

/** Form引擎持有方法 */
export interface FormEngine {
    /** 整个form加载完成 */
    didMount: (fn: BlankVoidFunction) => void;
    /** 整个form数据改变 */
    onChange: (fn: (arg: { values: Record<string, any>, changedName: Name }) => void) => void;
    /** 整个form卸载 */
    willUnmount: (fn: BlankVoidFunction) => void;
    /** 设置字段属性的值 */
    setState: (states: Array<{ name: string, value: any }>) => void;
    /** 设置Schema的值 */
    setSchema: (schemas: Array<{ name: string, value: any }>) => void;
    /** 获取某字段的殷勤 */
    name: (name: Name) => FormItemEngine;

    setFields: (fields: FieldData[]) => void;
}

export interface FormItemEngine extends Omit<FormEngine, 'setState' | 'setSchema' | 'name' | 'setFields'> {
    /** 设置状态 */
    setState: (state: any) => void;
    /** 设置引擎 */
    setSchema: (schema: any) => void;
    /** 设置值 */
    setValue: (value: any) => void;
}

export enum TapName {
    DID_MOUNT = 'didMount',
    ON_Change = 'onChange',
    WILL_UNMOUNT = 'willUnmount',
    SET_STATE = 'setState',
    SET_SCHEMA = 'setSchema',
    FORCE_UPDATE = 'forceUpdate'
}

class FormHookMap<H> extends HookMap<H>{
    get(key: Name) {
        const _key = Array.prototype.concat(key);
        return super.get(key)
    }
    for(key: Name) {
        const _key = Array.prototype.concat(key);
        return super.for(key)
    }
}

/** 封装formHook */
class FormHook {
    _hook;
    _listeners: any[] = [];
    _onceListenrs: any[] = [];
    constructor(name: string, args: (readonly string[] & { 0: string; length: 1; }) | undefined) {
        this._hook = new SyncHook(args);
        this._hook.tap(name, (args) => {
            this._listeners.forEach(listener => { listener(args) });
            while (this._onceListenrs?.length) {
                const listener = this._onceListenrs.pop();
                listener(args)
            }
        })
    }
    /** 注册回调 */
    on(fn: (args_0: unknown) => void) {
        this._listeners.push(fn)
    }

    /** 注册回调，只触发一次，执行一次后自动移除 */
    once(fn: (args_0: unknown) => void) {
        this._onceListenrs.push(fn)
    }

    /** 移除回调 */
    off(fn: (args_0: unknown) => void) {
        this._listeners = this._listeners.filter(listener => listener !== fn)
    }

    /** 触发回调 */
    call(args: unknown) {
        this._hook.call(args)
    }
}

/**
 * Form引擎，与框架无关
 */
export default class Engine {
    hooks;
    _onChangeHooks;
    _updateStateHooks;
    _updateSchemaHooks;
    _didMountHooks;
    _willUnmountHooks;
    _forceUpdateHooks;
    _store = {};

    constructor() {
        this.hooks = {
            /** 整个form加载完成 */
            didMount: new FormHook(TapName.DID_MOUNT, ['fn']),
            /** 整个form改变 */
            onChange: new FormHook(TapName.ON_Change, ['fn']),
            /** 整个form卸载完成 */
            willUnmount: new FormHook(TapName.WILL_UNMOUNT, ['fn']),
            /** 这个form强制更新 */
            forceUpdate: new FormHook(TapName.FORCE_UPDATE, ['fn'])
        }
        this._onChangeHooks = new FormHookMap(key => new FormHook(TapName.ON_Change, ["fn"]));
        this._updateStateHooks = new FormHookMap(key => new FormHook(TapName.SET_STATE, ["state"]));
        this._updateSchemaHooks = new FormHookMap(key => new FormHook(TapName.SET_SCHEMA, ["schema"]));
        this._didMountHooks = new FormHookMap(key => new FormHook(TapName.DID_MOUNT, ["fn"]));
        this._willUnmountHooks = new FormHookMap(key => new FormHook(TapName.WILL_UNMOUNT, ["fn"]));
        this._forceUpdateHooks = new FormHookMap(key => new FormHook(TapName.FORCE_UPDATE, ['fn']));
    }

    /** 设置字段的值 */
    setFields(fields: FieldData[]) {
        fields.forEach(({ name, value }) => {
            set(this._store, name, value);
            this.name(name).forceUpdate.call(undefined)
        })
    }

    /** 设置所有字段的值 */
    setFieldsValue(values: any) {
        this._store = values;
        this.hooks.forceUpdate.call(undefined)
    }

    /** 获取单个字段的值 */
    getFieldValue(name: Name) {
        return get(this._store, name)
    }

    /** 获取所有字段的值 */
    getFieldsValue() {
        return this._store
    }

    /** 重置字段 */
    resetFields() {
        this._store = {}
    }

    /** 注册插件 */
    registerPlugins(plugins: FormPlugin[]) {
        plugins.forEach(plugin => plugin.apply(this.pluginApi().formEngine()))
    }

    name(name: Name) {
        return {
            onChange: this._onChangeHooks.for(name),
            setState: this._updateStateHooks.for(name),
            setSchema: this._updateSchemaHooks.for(name),
            didMount: this._didMountHooks.for(name),
            willUnmount: this._willUnmountHooks.for(name),
            forceUpdate: this._forceUpdateHooks.for(name)
        }
    }

    pluginApi() {
        const _this: Engine = this
        return {
            name(name: Name): FormItemEngine {
                return {
                    /** 单个组件改变 */
                    // @ts-ignore
                    onChange: fn => _this.name(name).onChange.on(fn),
                    /** 单个组件设置状态 */
                    setState: state => _this.name(name).setState.call(state),
                    /** 单个组件设置schema */
                    setSchema: schema => _this.name(name).setSchema.call(schema),
                    /** 加载完成 */
                    didMount: fn => _this.name(name).didMount.on(fn),
                    /** 卸载完成 */
                    willUnmount: fn => _this.name(name).willUnmount.on(fn),

                    setValue: (value: any) => _this.setFields([{ name, value }])
                }
            },

            formEngine(): FormEngine {
                return {
                    didMount: (fn) => _this.hooks.didMount.on(fn),
                    setFields: _this.setFields.bind(_this),
                    /** @ts-ignore */
                    onChange: fn => _this.hooks.onChange.on(fn),
                    willUnmount: fn => _this.hooks.willUnmount.on(fn),
                    name: name => this.name(name),
                    setState: states => states.forEach(({ name, value }) => this.name(name).setState(value)),
                    setSchema: schemas => schemas.forEach(({ name, value }) => this.name(name).setState(value))
                }
            }
        }
    }
}