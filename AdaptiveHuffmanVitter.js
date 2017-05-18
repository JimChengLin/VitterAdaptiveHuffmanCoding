var Vitter;
(function (Vitter) {
    const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.~' + `:/?#[]@!$&'()*+,;=%`;
    const TABLE = {};
    class BitPack {
        constructor(len, val) {
            this.len = len;
            this.val = val;
        }
        toString() {
            let res = '0b';
            const binVal = this.val.toString(2);
            for (let i = 0, len = this.len - binVal.length; i < len; ++i) {
                res += '0';
            }
            res += binVal;
            return res;
        }
        extend(other) {
            this.len += other.len;
            this.val <<= other.len;
            this.val |= other.val;
            return this;
        }
        equals(other) {
            return this.len === other.len && this.val === other.val;
        }
    }
    class BitPackHolder {
        constructor() {
            this.container = [];
        }
        toString() {
            const bitArray = this.bitArray();
            bitArray.push(1);
            for (let i = 0, len = 6 - bitArray.length % 6; i < len && len !== 6; ++i) {
                bitArray.push(0);
            }
            let res = '';
            for (let i = 0, len = bitArray.length / 6; i < len; ++i) {
                let num = 0;
                for (let j = 0; j < 6; ++j) {
                    num <<= 1;
                    num |= bitArray[i * 6 + j];
                }
                res += ALPHABET[num];
            }
            return res;
        }
        static stringToBitArray(source) {
            const res = [];
            for (const char of source) {
                const num64 = ALPHABET.indexOf(char);
                for (let i = 5; i >= 0; --i) {
                    res.push(+Boolean(num64 & (1 << i)));
                }
            }
            while (res[res.length - 1] === 0) {
                res.pop();
            }
            res.pop();
            return res;
        }
        *bitStream() {
            for (let i = this.container.length - 1; i >= 0; --i) {
                const bitPack = this.container[i];
                for (let j = 0, len = bitPack.len; j < len; ++j) {
                    yield +Boolean(bitPack.val & (1 << j));
                }
            }
        }
        bitArray() {
            const bitArray = [];
            for (const bit of this.bitStream()) {
                bitArray.push(bit);
            }
            return bitArray.reverse();
        }
    }
    Vitter.BitPackHolder = BitPackHolder;
    (function init() {
        const e = Math.floor(Math.log2(ALPHABET.length));
        const r = ALPHABET.length - Math.pow(2, e);
        const k = 2 * r;
        for (let i = 0, len = ALPHABET.length - k, cnt = r; i < len; ++i, ++cnt) {
            TABLE[ALPHABET[i]] = new BitPack(e, cnt);
        }
        for (let j = ALPHABET.length - k, len = ALPHABET.length, cnt = 0; j < len; ++j, ++cnt) {
            TABLE[ALPHABET[j]] = new BitPack(e + 1, cnt);
        }
    })();
    class Tree {
        constructor() {
            this.root = new TreeNode();
            this.NYT = this.root;
            this.NYT.char = 'NYT';
            this.UPDATE_TABLE = { 'NYT': this.NYT };
        }
        toString() {
            let res = '';
            function add(node, lv = 0) {
                if (!node) {
                    return;
                }
                let prefix = '';
                if (lv > 0) {
                    for (let i = 0; i < lv; ++i) {
                        prefix += '    ';
                    }
                }
                res += prefix + node.toString() + '\n';
                add(node.left, lv + 1);
                add(node.right, lv + 1);
            }
            add(this.root);
            return res;
        }
        encode(char) {
            let res;
            if (!this.UPDATE_TABLE.hasOwnProperty(char)) {
                res = this.NYT.toBitPack().extend(TABLE[char]);
                this.update(this.NYT, char);
            }
            else {
                const charNode = this.UPDATE_TABLE[char];
                res = charNode.toBitPack();
                this.update(charNode);
            }
            return res;
        }
        decode(source) {
            let res = '';
            const bitArray = BitPackHolder.stringToBitArray(source);
            let bitPack;
            let state = this.root;
            for (const bit of bitArray) {
                if (state === this.NYT && !bitPack) {
                    bitPack = new BitPack(0, 0);
                }
                if (bitPack) {
                    bitPack.extend({ len: 1, val: bit });
                    for (const key in TABLE) {
                        if (TABLE[key].equals(bitPack)) {
                            res += key;
                            this.encode(key);
                            state = this.root;
                            bitPack = null;
                            break;
                        }
                    }
                }
                else {
                    if (bit === 0) {
                        state = state.left;
                    }
                    else {
                        state = state.right;
                    }
                    if (state === this.NYT) {
                        continue;
                    }
                    if (state.char) {
                        res += state.char;
                        this.encode(state.char);
                        state = this.root;
                    }
                }
            }
            return res;
        }
        update(q, char = '') {
            let leafToIncrement;
            if (q === this.NYT) {
                const NYTParent = new TreeNode();
                const charNode = new TreeNode();
                if (this.NYT.parent) {
                    this.NYT.parent.bindLeft(NYTParent);
                }
                else {
                    this.root = NYTParent;
                }
                NYTParent.bindLeft(this.NYT);
                NYTParent.bindRight(charNode);
                charNode.char = char;
                this.UPDATE_TABLE[char] = charNode;
                q = NYTParent;
                leafToIncrement = charNode;
            }
            else {
                const block = this.findBlock(q.weight).filter(val => val.isLeaf() === q.isLeaf());
                Tree.swap(q, block[block.length - 1]);
                if (q.parent.left === this.NYT) {
                    leafToIncrement = q;
                    q = q.parent;
                }
            }
            while (q !== this.root) {
                q = this.slideAndIncrement(q);
            }
            if (leafToIncrement) {
                this.slideAndIncrement(leafToIncrement);
            }
        }
        slideAndIncrement(q) {
            const block = q.isLeaf() ?
                this.findBlock(q.weight).filter(val => !val.isLeaf()) :
                this.findBlock(q.weight + 1).filter(val => val.isLeaf());
            let parent = q.parent;
            Tree.slide(q, block);
            ++q.weight;
            if (q.isLeaf()) {
                parent = q.parent;
            }
            return parent;
        }
        static slide(q, block) {
            if (!block.length) {
                return;
            }
            const blockAfter = block.slice(0);
            blockAfter.push(q);
            block.unshift(q);
            const blockParentInfo = block.map((val) => [val.parent, val.parent.left === val ? 0 : 1]);
            for (let i = 0; i < block.length; ++i) {
                const after = blockAfter[i];
                const [parent, direction] = blockParentInfo[i];
                if (direction === 0) {
                    parent.bindLeft(after);
                }
                else {
                    parent.bindRight(after);
                }
            }
        }
        findBlock(weight) {
            const res = [];
            let q = [this.root];
            while (q.length) {
                const tempQ = [];
                for (const cursor of q) {
                    if (cursor.left && cursor.left.weight >= weight) {
                        tempQ.push(cursor.left);
                    }
                    if (cursor.right && cursor.right.weight >= weight) {
                        tempQ.push(cursor.right);
                    }
                }
                for (let i = tempQ.length - 1; i >= 0; --i) {
                    const cursor = tempQ[i];
                    if (cursor.weight === weight) {
                        res.push(cursor);
                    }
                }
                q = tempQ;
            }
            return res.reverse();
        }
        static swap(node, target) {
            if (node === target || node.parent === target) {
                return;
            }
            if (node.parent === target.parent) {
                [node.parent.left, node.parent.right] = [node.parent.right, node.parent.left];
                return;
            }
            const targetParent = target.parent;
            if (node.parent.left === node) {
                node.parent.bindLeft(target);
            }
            else {
                node.parent.bindRight(target);
            }
            if (targetParent.left === target) {
                targetParent.bindLeft(node);
            }
            else {
                targetParent.bindRight(node);
            }
        }
    }
    Vitter.Tree = Tree;
    class TreeNode {
        constructor() {
            this.weight = 0;
        }
        toString() {
            if (this.char) {
                return this.char + ' ' + this.weight.toString();
            }
            else {
                return '- ' + this.weight.toString();
            }
        }
        toBitPack() {
            let cnt = 0;
            let code = 0;
            let cursor = this;
            while (cursor.parent) {
                if (cursor === cursor.parent.right) {
                    code |= (1 << cnt);
                }
                ++cnt;
                cursor = cursor.parent;
            }
            return new BitPack(cnt, code);
        }
        bindLeft(node) {
            this.left = node;
            node.parent = this;
        }
        bindRight(node) {
            this.right = node;
            node.parent = this;
        }
        isLeaf() {
            return !this.left && !this.right;
        }
    }
})(Vitter || (Vitter = {}));
//# sourceMappingURL=AdaptiveHuffmanVitter.js.map