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
    name: (name: Name) => FormItemEngine
}

export interface FormItemEngine extends Omit<FormEngine, 'setState' | 'setSchema' | 'name'> {
    /** 设置状态 */
    setState: (state: any) => void;
    /** 设置引擎 */
    setSchema: (schema: any) => void;
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
    onChangeHooks;
    updateStateHooks;
    updateSchemaHooks;
    didMountHooks;
    willUnmountHooks;
    forceUpdateHooks;
    store = {};

    constructor() {
        this.hooks = {
            /** 整个form加载完成 */
            didMount: new FormHook(TapName.DID_MOUNT, ['fn']),
            /** 整个form改变 */
            onChange: new FormHook(TapName.ON_Change, ['fn']),
            /** 整个form卸载完成 */
            willUnmount: new FormHook(TapName.WILL_UNMOUNT, ['fn']),
            /** 这个form强制更新 */
            forceUpdate:  new FormHook(TapName.FORCE_UPDATE, ['fn'])
        }
        this.onChangeHooks = new FormHookMap(key => new FormHook(TapName.ON_Change, ["fn"]));
        this.updateStateHooks = new FormHookMap(key => new FormHook(TapName.SET_STATE, ["state"]));
        this.updateSchemaHooks = new FormHookMap(key => new FormHook(TapName.SET_SCHEMA, ["schema"]));
        this.didMountHooks = new FormHookMap(key => new FormHook(TapName.DID_MOUNT, ["fn"]));
        this.willUnmountHooks = new FormHookMap(key => new FormHook(TapName.WILL_UNMOUNT, ["fn"]));
        this.forceUpdateHooks = new FormHookMap(key => new FormHook(TapName.FORCE_UPDATE,['fn']));
    }

    /** 设置字段的值 */
    setFields(fields: FieldData[]) {
        fields.forEach(({ name, value }) => set(this.store, name, value))
    }

    /** 设置所有字段的值 */
    setFieldsValue(values: any) {
        this.store = values
    }

    /** 获取单个字段的值 */
    getFieldValue(name: Name) {
        return get(this.store, name)
    }

    /** 获取所有字段的值 */
    getFieldsValue() {
        return this.store
    }

    /** 重置字段 */
    resetFields() {
        this.store = {}
    }

    /** 注册插件 */
    registerPlugins(plugins: FormPlugin[]) {
        plugins.forEach(plugin => plugin.apply(this.formEngine()))
    }

    name(name: Name): FormItemEngine {
        return {
            /** 单个组件改变 */
            // @ts-ignore
            onChange: fn => this.onChangeHooks.for(name).on(fn),
            /** 单个组件设置状态 */
            setState: state => this.updateStateHooks.for(name).call(state),
            /** 单个组件设置schema */
            setSchema: schema => this.updateSchemaHooks.for(name).call(schema),
            /** 加载完成 */
            didMount: fn => this.didMountHooks.for(name).on(fn),
            /** 卸载完成 */
            willUnmount: fn => this.willUnmountHooks.for(name).on(fn)
        }
    }

    formEngine(): FormEngine {
        return {
            didMount: (fn) => this.hooks.didMount.on(fn),
            /** @ts-ignore */
            onChange: fn => this.hooks.onChange.on(fn),
            willUnmount: fn => this.hooks.willUnmount.on(fn),
            name: name => this.name(name),
            setState: states => states.forEach(({ name, value }) => this.name(name).setState(value)),
            setSchema: schemas => schemas.forEach(({ name, value }) => this.name(name).setState(value))
        }
    }
}