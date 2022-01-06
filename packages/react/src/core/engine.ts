import { AsyncHook, HookMap, SyncHook } from "tapable";
import set from 'lodash.set';
import get from 'lodash.get'
import topath from 'lodash.topath'
import FormPlugin from "./plugin";
import Validator from "../validator";

type BlankVoidFunction = () => void;

export type Name = string | number | Array<string | number>;

export type FieldData = { name: Name, value?: any }

type DidMount<T = BlankVoidFunction> = {
    on: (fn: T) => void;
    once: (fn: T) => void;
}

type WillUnMount<T = BlankVoidFunction> = DidMount<T>;


type FormChange = {
    on: (fn: (arg: { values: Record<string, any>, changedName: Name }) => void) => void;
    once: (fn: (arg: { values: Record<string, any>, changedName: Name }) => void) => void;
    intercept: (intercepor: Interceptor) => void
}

type FormItemChangeForName = {
    on: (fn: (arg: { value: any, name: Name }) => void) => void;
    once: (fn: (arg: { value: any, name: Name }) => void) => void;
    intercept: (intercepor: Interceptor) => void
}

type FormItemChange = {
    on: (fn: (value: any) => void) => void;
    once: (fn: (value: any) => void) => void;
    intercept: (intercepor: Interceptor) => void
}

/** Form引擎持有方法 */
export interface FormEngine {
    /** 整个form加载完成 */
    didMount: DidMount;
    onItemDidMout: DidMount<(name: Name) => void>
    /** 整个form数据改变 */
    onChange: FormChange;
    /** 整个form卸载 */
    willUnmount: WillUnMount;
    onItemWillUnmount: WillUnMount<(name: Name) => void>
    /** 设置字段属性的值 */
    setState: (states: Array<{ name: string, value: any }>) => void;
    /** 设置item状态值 */
    setItemState: (states: Array<{ name: string, value: any }>) => void;
    /** 设置Schema的值 */
    setSchema: (schemas: Array<{ name: string, value: any }>) => void;
    /** 获取某字段的殷勤 */
    get: (name: Name) => FormItemEngine;

    setFields: (fields: FieldData[]) => void;

    getFieldsValue: () => Record<string, any>;

    itemOnChange: FormItemChangeForName
}

export interface FormItemEngine extends Pick<FormEngine, 'willUnmount' | 'didMount'> {
    /** 设置状态 */
    setState: (state: any) => void;
    /** 设置引擎 */
    setSchema: (schema: any) => void;
    /** 设置值 */
    setValue: (value: any) => void;

    onChange: FormItemChange;

    setItemState: (value: any) => void;
}

export enum TapName {
    DID_MOUNT = 'didMount',
    ON_Change = 'onChange',
    WILL_UNMOUNT = 'willUnmount',
    SET_STATE = 'setState',
    SET_SCHEMA = 'setSchema',
    FORCE_UPDATE = 'forceUpdate',
    VALIDATE = 'validate'
}

class FormHookMap<H> extends HookMap<H>{

    key(key: Name) {
        const keyArr = topath(key);
        return keyArr.join('_')
    }

    get(key: Name) {
        return super.get(this.key(key))
    }

    for(key: Name) {
        return super.for(this.key(key))
    }
}

/**
 * 拦截器定义
 */
interface Interceptor {
    beforeCall?: (args: any) => any
}

/** 封装formHook */
class FormHook {
    _hook;
    _listeners: any[] = [];
    _onceListenrs: any[] = [];
    _interceptors: Interceptor[] = [];
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
    on(fn: (args_0: any) => void) {
        this._listeners.push(fn)
    }

    /** 注册回调，只触发一次，执行一次后自动移除 */
    once(fn: (args_0: any) => void) {
        this._onceListenrs.push(fn)
    }

    /** 移除回调 */
    off(fn: (args_0: any) => void) {
        this._listeners = this._listeners.filter(listener => listener !== fn)
    }

    /** 触发回调 */
    call(args: any) {
        const executors = this._interceptors.map(({ beforeCall }) => beforeCall);
        let res: any = args;
        while (executors.length) {
            const executor = executors.shift();
            res = executor?.(res)
        }
        this._hook.call(res)
    }

    intercept(interceptor: Interceptor) {
        this._interceptors.push(interceptor)
    }

    /**
     * 供plugin使用
     * @param names 
     * @returns 
     */
    toPluginUse(names: Array<keyof FormHook>) {
        const methods: any = {};
        // @ts-ignore
        names.forEach(name => methods[name] = this[name].bind(this));
        return methods
    }

}

interface FormIntercepor {
    onChange: Interceptor[]
}

/**
 * Form引擎，与框架无关
 */
export default class Engine {
    hooks;
    _onChangeHooks;
    _updateStateHooks;
    _updateItemStateHooks;
    _updateSchemaHooks;
    _didMountHooks;
    _willUnmountHooks;
    _forceUpdateHooks;
    _validateHooks;
    _validator = new Validator();
    _store = {};
    _error = {};

    constructor() {
        this.hooks = {
            /** 整个form加载完成 */
            didMount: new FormHook(TapName.DID_MOUNT, ['fn']),
            /** 整个form改变 */
            onChange: new FormHook(TapName.ON_Change, ['fn']),
            /** 整个form卸载完成 */
            willUnmount: new FormHook(TapName.WILL_UNMOUNT, ['fn']),
            /** 这个form强制更新 */
            forceUpdate: new FormHook(TapName.FORCE_UPDATE, ['fn']),

            itemOnChange: new FormHook(TapName.ON_Change, ['fn']),

            itemDidMount: new FormHook(TapName.DID_MOUNT, ['fn']),

            itemWillUnmount: new FormHook(TapName.DID_MOUNT, ['fn'])
        }
        this._onChangeHooks = new FormHookMap(key => new FormHook(TapName.ON_Change, ["fn"]));
        this._updateStateHooks = new FormHookMap(key => new FormHook(TapName.SET_STATE, ["state"]));
        this._updateItemStateHooks = new FormHookMap(key => new FormHook(TapName.SET_STATE, ["state"]));
        this._updateSchemaHooks = new FormHookMap(key => new FormHook(TapName.SET_SCHEMA, ["schema"]));
        this._didMountHooks = new FormHookMap(key => new FormHook(TapName.DID_MOUNT, ["fn"]));
        this._willUnmountHooks = new FormHookMap(key => new FormHook(TapName.WILL_UNMOUNT, ["fn"]));
        this._forceUpdateHooks = new FormHookMap(key => new FormHook(TapName.FORCE_UPDATE, ['fn']));
        this._validateHooks = new FormHookMap(key => new FormHook(TapName.VALIDATE, ['fn']));
    }

    /** 设置字段的错误值 */
    setErrors(fields: FieldData[]) {
        fields.forEach(({ name, value }) => {
            set(this._error, name, value);
            this.get(name).forceUpdate.call(undefined)
        })
    }

    /** 获取字段的错误值 */
    getFieldError(name: Name) {
        return get(this._error, name, undefined)
    }

    /** 设置字段的值 */
    setFields(fields: FieldData[]) {
        fields.forEach(({ name, value }) => {
            set(this._store, name, value);
            this.get(name).forceUpdate.call(undefined)
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
        this.hooks.forceUpdate.call(undefined)
    }

    /** 注册插件 */
    registerPlugins(plugins: FormPlugin[]) {
        plugins.forEach(plugin => plugin.apply(this.pluginApi().formEngine()))
    }

    get(name: Name) {
        return {
            onChange: this._onChangeHooks.for(name),
            setState: this._updateStateHooks.for(name),
            setItemState: this._updateItemStateHooks.for(name),
            setSchema: this._updateSchemaHooks.for(name),
            didMount: this._didMountHooks.for(name),
            willUnmount: this._willUnmountHooks.for(name),
            forceUpdate: this._forceUpdateHooks.for(name),
            validate: this._validateHooks.for(name),
        }
    }

    pluginApi() {
        const _this: Engine = this
        return {
            get(name: Name): FormItemEngine {
                return {
                    /** 单个组件改变 */
                    onChange: _this.get(name).onChange.toPluginUse(['on', 'once', 'intercept']),
                    /** 单个组件设置状态 */
                    setState: state => _this.get(name).setState.call(state),
                    /** 单个组件设置schema */
                    setSchema: schema => _this.get(name).setSchema.call(schema),
                    /** 加载完成 */
                    didMount: _this.get(name).didMount.toPluginUse(['on', 'once']),
                    /** 卸载完成 */
                    willUnmount: _this.get(name).willUnmount.toPluginUse(['on', 'once']),

                    setValue: (value: any) => _this.setFields([{ name, value }]),

                    setItemState: (value: any) => _this.get(name).setItemState.call(value)

                }
            },

            formEngine(): FormEngine {
                return {
                    didMount: _this.hooks.didMount.toPluginUse(['on', 'once']),
                    onItemDidMout: _this.hooks.itemDidMount.toPluginUse(['on', 'once']),
                    onItemWillUnmount: _this.hooks.itemWillUnmount.toPluginUse(['on', 'once']),
                    setFields: _this.setFields.bind(_this),
                    getFieldsValue: _this.getFieldsValue.bind(_this),
                    onChange: _this.hooks.onChange.toPluginUse(['on', 'once', 'intercept']),
                    itemOnChange: _this.hooks.itemOnChange.toPluginUse(['on', 'once', 'intercept']),
                    willUnmount: _this.hooks.willUnmount.toPluginUse(['on', 'once']),
                    get: name => this.get(name),
                    setState: states => states.forEach(({ name, value }) => this.get(name).setState(value)),
                    setItemState: states => states.forEach(({ name, value }) => this.get(name).setItemState(value)),
                    setSchema: schemas => schemas.forEach(({ name, value }) => this.get(name).setState(value))
                }
            }
        }
    }
}