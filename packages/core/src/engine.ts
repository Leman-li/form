import { HookMap, SyncHook } from "tapable";
import FormPlugin from "./plugin";

type Function<P, R> = (p: P) => R;

type BlankVoidFunction = () => void;

type Name = string | number | Array<string | number>

/** Form引擎持有方法 */
export interface FormEngine {
    /** 整个form加载完成 */
    didMount: (fn: BlankVoidFunction) => void;
    /** 整个form数据改变 */
    onChange: (fn: Function<Record<string, any>, void>) => void;
    /** 整个form卸载 */
    willUnmount: (fn: BlankVoidFunction) => void;
    /** 设置字段属性的值 */
    setState: (states: Array<{ name: string, value: any }>) => void;
    /** 设置Schema的值 */
    setSchema: (schemas: Array<{ name: string, value: any }>) => void;
    /** 获取某字段的殷勤 */
    name: (name: Name) => FormItemEngine
}

interface FormItemEngine extends Omit<FormEngine, 'setState' | 'setSchema' | 'name'> {
    /** 设置状态 */
    setState: (state: any) => void;
    /** 设置引擎 */
    setSchema: (schema: any) => void;
}

enum TapName {
    DID_MOUNT = 'didMount',
    ON_Change = 'onChange',
    WILL_UNMOUNT = 'willUnmount',
    SET_STATE = 'setState',
    SET_SCHEMA = 'setSchema'
}

export default class BaseEngine {
    hooks;
    onChangeHooks;
    updateStateHooks;
    updateSchemaHooks;
    didMountHooks;
    willUnmountHooks;

    constructor() {
        this.hooks = {
            /** 整个form加载完成 */
            didMount: new SyncHook(['fn']),
            /** 整个form改变 */
            onChange: new SyncHook<Record<string, any>>(['fn']),
            /** 整个form卸载完成 */
            willUnmount: new SyncHook(['fn'])
        }
        this.onChangeHooks = new HookMap(key => new SyncHook<any>(["fn"]));
        this.updateStateHooks = new HookMap(key => new SyncHook(["state"]));
        this.updateSchemaHooks = new HookMap(key => new SyncHook(["schema"]));
        this.didMountHooks = new HookMap(key => new SyncHook(["fn"]));
        this.willUnmountHooks = new HookMap(key => new SyncHook(["fn"]));
    }

    /** 注册插件 */
    registerPlugins(plugins: FormPlugin[]) {
        plugins.forEach(plugin => plugin.apply(this.formEngine()))
    }

    name(name: Name): FormItemEngine {
        return {
            /** 单个组件改变 */
            onChange: fn => this.onChangeHooks.for(name).tap(TapName.ON_Change, fn),
            /** 单个组件设置状态 */
            setState: state => this.updateStateHooks.for(name).call(state),
            /** 单个组件设置schema */
            setSchema: schema => this.updateSchemaHooks.for(name).call(schema),
            /** 加载完成 */
            didMount: fn => this.didMountHooks.for(name).tap(TapName.DID_MOUNT, fn),
            /** 卸载完成 */
            willUnmount: fn => this.willUnmountHooks.for(name).tap(TapName.WILL_UNMOUNT, fn)
        }
    }

    formEngine(): FormEngine {
        return {
            didMount: (fn) => this.hooks.didMount.tap(TapName.DID_MOUNT, fn),
            onChange: fn => this.hooks.onChange.tap(TapName.ON_Change, fn),
            willUnmount: fn => this.hooks.willUnmount.tap(TapName.WILL_UNMOUNT, fn),
            name: name => this.name(name),
            setState: states => states.forEach(({ name, value }) => this.name(name).setState(value)),
            setSchema: schemas => schemas.forEach(({ name, value }) => this.name(name).setState(value))
        }
    }
}