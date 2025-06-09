// c d e -> 2 3 4
// e c d h -> 4 2 3 0

// 需要求连续最长子序列
// 贪心算法 + 二分查找 + 追溯

// 2 3 7 6 8 4 9 11 -> 2 3 4 8 9 11
// 2
// 2 3
// 2 3 7
// 2 3 6
// 2 3 6 8
// 2 3 4 8
// 2 3 4 8 9
// 2 3 4 8 9 11
// 2 3 6 8 9 11

function getSequence(arr = []) {
    const result = [0];
    const len = arr.length;
    let start;
    let end;
    let middle;

    const dp = new Array(len).fill(0);

    for (let i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI === 0) continue;
        let lastIndex = result[result.length - 1];
        if (arr[lastIndex] < arrI) {
            dp[i] = result[result.length - 1]; // 正常放入的时候，前一个节点索引就是result中的最后一个
            result.push(i);
            continue;
        }

        start = 0;
        end = result.length - 1;
        while (start < end) {
            middle = Math.floor((start + end) / 2);
            if (arr[result[middle]] < arrI) {
                start = middle + 1;
            } else {
                end = middle;
            }
        }
        if (arrI < arr[result[start]]) {
            dp[i] = result[start - 1];
            result[start] = i;
        }
    }

    let l = result.length;
    let last = result[l - 1];
    while (l-- > 0) {
        result[l] = last;
        last = dp[last];
    }

    return result;
}

getSequence([2, 6, 7, 8, 9, 11]);
getSequence([2, 4, 1, 5, 6, 8, 7, 9, 4]);
