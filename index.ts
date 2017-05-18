const input = document.querySelector('#input-string') as HTMLTextAreaElement;
const output = document.querySelector('#output-string') as HTMLTextAreaElement;

const inputBtn = document.querySelector('#input-btn') as HTMLButtonElement;
const outputBtn = document.querySelector('#output-btn') as HTMLButtonElement;

inputBtn.onclick = () => {
    try {
        const encodeTree = new Vitter.Tree();
        const holder = new Vitter.BitPackHolder();
        for (const char of input.value) {
            holder.container.push(encodeTree.encode(char));
        }
        output.value = holder.toString();
    } catch (e) {
        alert("Input Error");
        console.error(e);
    }
};

outputBtn.onclick = () => {
    try {
        const decodeTree = new Vitter.Tree();
        input.value = decodeTree.decode(output.value);
    } catch (e) {
        alert("Output Error");
        console.error(e);
    }
};

if (location.hash.length > 1) {
    location.assign((new Vitter.Tree()).decode(location.hash.slice(1)));
}