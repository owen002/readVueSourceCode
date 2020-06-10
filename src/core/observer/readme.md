## 响应式实现
new Vue -->
initState -- 初始化props data

## data初始化流程：
data --> proxy --> observe
## observe:
observer --> new Observer(观察者) --> dep --> defineProperty(value,__ob__,this) --> walk(遍历对象属性，调用defineReactive)
## defineReactive：
递归调用observe
get:依赖收集
    执行时机 mount组件-->new渲染watcher-->updateComponent(渲染watcher的get)-->vm.render-->call render function(访问get)-->render vnode-->update patch到dom上
    
    访问get--> dep.depend() --> dep.target.addDep --> dep.addSub(watcher) --> watcher依赖subs

set:派发更新 dep.notify() --> watcher update --> queueWatcher(多次watcher改变在一个tick内只执行一次) --> nextTick(flushSchedulerQueue) --> queue.sort() --> 遍历queue执行wather.run
    queue.sort：
        1.组件更新是从父->子
        2.userWatcher是在渲染watcher之前
        3.子组件销毁在父组件回调中可以被省略

## vue $set
isArray --> target.length --> target.splice
isObject --> defineReactive --> __ob__.dep.notify()
数组、$set本质上是手动通知渲染watcher做渲染


## computed
initstate --> initComputed --> new Watcher(user watcher) --> defineComputed -->
    定义computed get: createComputedGetter --> get Watcher --> watcher.depend --> watcher.evaluate()
    1.new computed Watcher:(不会立即求值，渲染watcher会立即求值)
    访问computed：this.dep.depend() 订阅watcher --> 求值watcher.evaluate() --> 访问computed get --> 依赖收集并且返回求值结果
    
    多次计算比较新旧值，变化了再通知watcher更新

c
## watcher
initstate --> initWatcher --> createWatcher --> $watch --> new Watcher(user watcher) --> this.getter = parsePath(expOrFn) --> watcher.get.call --> dep.depend

## 场景
计算属性适用在模板渲染中
侦听属性适用于某个值的变化完成复杂的业务逻辑，更加灵活的配置deep immediate sync


# 组件更新
diff过程从根到叶子递归比较patchVnode 对list特殊处理
_render vnode --> _update --> vm.__patch__ --> sameVnode?(key/tag/isComment/data) --> patchVnode
    新旧节点不同：
    创建新dom节点 --> vnode.parent更新占位符节点(递归) --> 删除旧节点
    新旧节点相同： patchVnode --> 比对children --> updateChildren/只有新/只有老/都没有
        
