export function getSequence(arr: Array<number>) {
    const result = [0];
    const len = arr.length;
    let start: number;
    let end: number;
    let middle: number;

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
