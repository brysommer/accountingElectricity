import { Model, DataTypes } from "sequelize";
import { sequelize } from './sequelize.js';


class User extends Model {}
User.init({
    chat_id: {
        type: DataTypes.BIGINT,
        allowNull: true,
        unique: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    day: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    night: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    dayDifference: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    nightDifference: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    balance: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

}, {
    freezeTableName: false,
    timestamps: true,
    modelName: 'users',
    sequelize
});


const updateUserByChatId = async (chat_id, updateParams) => {
    const res = await User.update({ ...updateParams } , { where: { chat_id } });
    if (res[0]) {
        const data = await findUserByChatId(chat_id);
        if (data) {
            //logger.info(`User ${data.chat_id} updated`);
            return data;
        }
        /*
        logger.info(`User ${chat_id} updated, but can't read result data`);
        */
    } 
    return undefined;
};

const findUserByChatId = async (chat_id) => {
    const res = await User.findOne({ where: { chat_id: chat_id } });
    if (res) return res.dataValues;
    return res;
};

const findAllUser = async () => {
    const res = await User.findAll();
    if (res) return res.dataValues;
    return res;
};

const createNewUserByChatId = async (chat_id, username) => {
    let res;
    try {
        res = await User.create({ chat_id, name: username });
        res = res.dataValues;
    } catch (err) {
        logger.error(`Impossible to create user: ${err}. Chat id ${chat_id}`);
    }
    return res;
};

export {
    User,
    updateUserByChatId,
    findUserByChatId,
    findAllUser,
    createNewUserByChatId
};   