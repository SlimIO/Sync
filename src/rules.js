const regEx = RegExp("nix", "i");

module.exports = function rules({ name, archived }) {
    if (regEx.test(name)) {
        return false;
    }

    if (archived) {
        return false;
    }

    return true;
};
