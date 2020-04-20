
function complement(a, b) {
    if (a.indexOf(b) != -1) return true;
    if (b.indexOf(a) != -1) return true;
    return false;
}



module.exports = function () {
    this.comp = complement;
};
