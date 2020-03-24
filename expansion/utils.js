
function complement(a, b) {
    if (a.indexOf(b) == 1) return true;
    if (b.indexOf(a) == 1) return true;
    return false;
}

function dc(o) {
    return JSON.parse(JSON.stringify(o));
}

module.exports = {
    complement: complement,
    dc: dc
};
