Function.prototype.myBind = function(thisObj,...args1){
    let fn = this;
    return function(...args2){
        let args = args1.concat(args2)
        fn.call(thisObj,args)
    }
}

function a(){
    console.log(this)
}

a.myBind({c:1})
new a()