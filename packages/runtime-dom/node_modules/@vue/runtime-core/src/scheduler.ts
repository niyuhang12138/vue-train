const queue = []; // 缓存当前要执行的队列
let isFlushing = false; // 是否正在执行队列
const resolvePromise = Promise.resolve(); // 用于微任务的 Promise

// 如果同时在一个组件中更新多个状态 job肯定是同一个
// 同时开启一个异步任务
export function queueJob(job: () => void) {
    if (!queue.includes(job)) {
        queue.push(job); // 任务进入队列
    }

    if (!isFlushing) {
        isFlushing = true;

        resolvePromise.then(() => {
            isFlushing = false; // 重置状态
            const copy = queue.slice(0); // 复制当前队列
            queue.length = 0;
            copy.forEach((job) => job());
            copy.length = 0; // 清空复制的队列
        });
    }
}

// 通过时间循环的机制 延迟更新操作 先走宏任务 -> 微任务
