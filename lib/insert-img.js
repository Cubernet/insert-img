/**
 * insert-img
 * https://github.com/Cubernet/insert-img
 * by Cubernet
 *
 * Released under the MIT license.
 */

import {
    CompositeDisposable
} from 'atom';

var paster = require('./paster');

module.exports = {
    activate(state) {
        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace', {
            'insert-img:paste': () => paster.paste()
        }));
    },
    deactivate() {
        this.subscriptions.dispose();
    },

    serialize() {
        return {};
    }
};
