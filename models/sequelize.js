import { Sequelize } from 'sequelize';


export const sequelize = new Sequelize('counter', 'taxibot', '09bot@4516', {
    host: '49.13.142.186',
    dialect: 'postgres',
    port: 5432,  // Default port for PostgreSQL
    logging: false,  // Disable logging
});