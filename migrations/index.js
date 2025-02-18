import { User } from '../models/users.js';

const DEBUG = true;

const main = async () => {
    try {
        const syncState = await Promise.all([
            User.sync(),
        ]);
        
        
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
    }
};

main();
