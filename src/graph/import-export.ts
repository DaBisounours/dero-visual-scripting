// TODO Save + Import + Export

import { Project } from "./graph";

function download(filename: string, text: string) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

export const exportProject = (p: Project) => {
    download(p.name + '.json', JSON.stringify(p));
}
