/* @flow */
// 使用flow做代码静态类型检查

/**
 * 问题：变化include属性，从['a','b']->['a']，源代码中会将b组件从cache中删除，为什么从a进入到b的时候不会回调b组件的mounted钩子
 */

/**
 * isRegExp判断是否是正则
 * remove方法删除数组中某一项
 * getFirstComponentChild 获取第一个子组件
 */
import { isRegExp, remove } from 'shared/util'
import { getFirstComponentChild } from 'core/vdom/helpers/index'

type VNodeCache = { [key: string]: ?VNode };

// 获取组件的name属性
function getComponentName (opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag)
}

/**
 * 判断pattern和name是否匹配
 * @param {匹配的正则、字符串、字符串数组} pattern 
 * @param {被匹配的字符串} name 
 */
function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  if (Array.isArray(pattern)) {
    // 如果pattern是数组使用indexOf匹配name
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    // 如果pattern是字符串用逗号切割成数组，再用indexOf匹配name
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    // 如果是正则直接test匹配name
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

/**
 * @param {缓存组件挂载的对象} keepAliveInstance 
 * @param {过滤函数} filter 不符合条件的从cache中删除掉
 */
function pruneCache (keepAliveInstance: any, filter: Function) {
  // 获取的缓存对象
  const { cache, keys, _vnode } = keepAliveInstance
  // 遍历判断是否需要删除缓存对象
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]
    if (cachedNode) {
      // 匹配缓存组件名是否不符合过滤函数，不符合就删除vnode缓存
      const name: ?string = getComponentName(cachedNode.componentOptions)
      if (name && !filter(name)) {
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
}

/**
 * 删除cache中key对应的vnode缓存，删除keys数组中的key
 * @param {cache缓存vnode的数组} cache 
 * @param {要删除的key} key 
 * @param {key所在的keys数组} keys 
 * @param {} current 
 */
function pruneCacheEntry (
  cache: VNodeCache,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  const cached = cache[key]
  if (cached && (!current || cached.tag !== current.tag)) {
    cached.componentInstance.$destroy()
  }
  // 删除cache数组中key对应的vnode缓存
  cache[key] = null
  // 删除keys数组中的key
  remove(keys, key)
}

const patternTypes: Array<Function> = [String, RegExp, Array]

export default {
  name: 'keep-alive',
  // 抽象组件，不会渲染出任何的dom元素
  abstract: true,

  props: {
    include: patternTypes,
    exclude: patternTypes,
    max: [String, Number]
  },

  created () {
    // 创建一个cache对象，缓存容器，保存vnode节点
    this.cache = Object.create(null)
    this.keys = []
  },

  destroyed () {
    // 组件销毁时清楚cache缓存的实例
    for (const key in this.cache) {
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted () {
    // 监听include props
    this.$watch('include', val => {
      pruneCache(this, name => matches(val, name))
    })
    // 监听exclude props
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },
  /**
   * getFirstComponentChild获取第一个子组件->获取子组件的name||子组件的tag->判断include/exclude（符合ex则不缓存）
   * ->判断缓存的数量是否大于max
   */
  render () {
    // 获取keep-alive组件插槽中的v-slot:default
    const slot = this.$slots.default
    // 获取default组件内的第一个组件vnode
    const vnode: VNode = getFirstComponentChild(slot)
    // 获取vnode组件选项data/name/methods...
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      // check pattern
      // 获取vnode组件的name选项
      const name: ?string = getComponentName(componentOptions)
      // 获取keep-alive组件的include、exclude属性，准备做匹配
      const { include, exclude } = this
      /**
       * 判断vnode不缓存的情况
       * 如果include存在并且name不匹配include
       * 或者exclude存在并且name匹配exclude
       */
      if (
        // not included
        (include && (!name || !matches(include, name))) ||
        // excluded
        (exclude && name && matches(exclude, name))
      ) {
        return vnode
      }

      // 获取this对象上的cache缓存
      const { cache, keys } = this
      /**
       * key --- 用做缓存的vnode组件的索引
       * key的构成componentOptions.Ctor.cid::componentOptions.tag
       */
      const key: ?string = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key
      if (cache[key]) {
        // 如果cache缓存中存在key（cache中有key对应的vnode缓存）更新key
        vnode.componentInstance = cache[key].componentInstance
        // make current key freshest
        remove(keys, key)
        keys.push(key)
      } else {
        // cache中没有key对应的vnode缓存则存入cache
        cache[key] = vnode
        keys.push(key)
        // 如果keys的长度大于max则清除最老的key以及key对应的vnode
        // prune oldest entry
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
      }

      // vnode data中的keepalive属性置为true
      vnode.data.keepAlive = true
    }
    return vnode || (slot && slot[0])
  }
}
