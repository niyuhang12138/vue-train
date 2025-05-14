// 最长递增子序列
// 最优情况 [1, 2, 3, 4, 5] O(n)

// 求最长增长子序列的个数 先求个数？

// 贪心 + 二分 + 追溯
function getSequence(arr = []) {
    let len = arr.length;
    let result = [0];
    let resultLastIndex;

    let start;
    let end;
    let middle;

    let p = arr.slice(0); // 用来表示索引的

    for (let i = 0; i < len; i++) {
        const arrI = arr[i];
        // vue中序列中不会出现0, 如果序列中出现0的话可以忽略
        if (arrI !== 0) {
            resultLastIndex = result[result.length - 1];
            if (arr[resultLastIndex] < arrI) {
                result.push(i);
                p[i] = resultLastIndex; // 记录前驱节点
                continue;
            }

            // 这里就会出现， 当前向比最后一项大
            start = 0;
            end = result.length - 1;

            while (start < end) {
                middle = ((start + end) / 2) | 0;

                if (arr[result[middle]] < arrI) {
                    start = middle + 1;
                } else {
                    end = middle;
                }
            }

            // middle 就是第一个比当前值大的值
            if (arrI < arr[result[start]]) {
                p[i] = result[start - 1]; // 记录前驱节点
                result[start] = i;
            }
        }
    }

    // 追溯
    let i = result.length;
    let last = result[i - 1];

    while (i-- > 0) {
        result[i] = arr[last];
        last = p[last];
    }

    return result;
}

// let result = getSequence([1, 2, 3, 4, 5, 6]);
let result = getSequence([2, 5, 8, 4, 6, 7, 9, 3]);
console.log(result);

// 1. 看最新和尾部最后一项的关系， 如果比它大直接放到后面
// 2. 去列表中查找 比当前项大的 做替换

// 2 5 8 4 6 7 9 3

// 2
// 2 5
// 2 5 8
// 2 4 6
// 2 4 6 7
// 2 4 6 7 9
// 2 4 6 7 9 个数ok 这个可以通过前驱节点来进行修复

// 采用二分查找 + 谭鑫算法

// 3 4 5 9 7 6 2 1 8 11

// 3
// 3 4
// 3 4 5
// 3 4 5 9
// 3 4 5 7
// 3 4 5 6
// 2 4 5 6
// 1 4 5 6
// 1 4 5 6 8
// 1 4 5 6 8 11
