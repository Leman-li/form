
import React, { useEffect, useRef, useState } from "react"
import BaseEngine, { FormEngine } from "./engine"
import FormPlugin from "./plugin"

class Aplugin extends FormPlugin{
    apply(engine: FormEngine): void {
        engine.didMount(()=>{
            console.log('-----')
            setTimeout(()=>{
                engine.name('aaa').setState('n1ew3254')
            },2000)
        })
    }
}
class bplugin extends FormPlugin{
    apply(engine: FormEngine): void {
        engine.didMount(()=>{
            console.log('-----111')
            setTimeout(()=>{
                engine.name('aaa').setState('new3254')
            },1000)
        })
    }
}
export default function(){
    const engine = useRef(new BaseEngine());
    const [value, setValue] = useState('12234')
    useEffect(()=>{
        engine.current.registerPlugins([new Aplugin(), new bplugin()]);
        engine.current.hooks.didMount.call('')
        engine.current.updateStateHooks.for('aaa').tap('aaaaa',(value)=>setValue(value))
    },[])
    return <div>{value}</div>
}