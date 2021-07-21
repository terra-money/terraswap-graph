import {MigrationInterface, QueryRunner} from "typeorm";

export class Initial1626863171160 implements MigrationInterface {
    name = 'Initial1626863171160'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "exchange_rate" ("id" SERIAL NOT NULL, "timestamp" TIMESTAMP NOT NULL, "pair" character varying NOT NULL, "token_0" character varying NOT NULL, "token_1" character varying NOT NULL, "token_0_price" numeric(40,10) NOT NULL, "token_1_price" numeric(40,10) NOT NULL, "token_0_reserve" numeric(40) NOT NULL, "token_1_reserve" numeric(40) NOT NULL, "liquidity_ust" numeric(40) NOT NULL, CONSTRAINT "PK_5c5d27d2b900ef6cdeef0398472" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pair_info" ("pair" character varying NOT NULL, "token_0" character varying NOT NULL, "token_1" character varying NOT NULL, "lp_token" character varying NOT NULL, CONSTRAINT "PK_1ea0661b66965a78bbf78a06b02" PRIMARY KEY ("pair"))`);
        await queryRunner.query(`CREATE TABLE "token_info" ("token_address" character varying NOT NULL, "symbol" character varying NOT NULL, "pairs" text NOT NULL, "decimals" integer NOT NULL, CONSTRAINT "PK_032b8c0cc0a7d7f62fd9d98acb4" PRIMARY KEY ("token_address"))`);
        await queryRunner.query(`CREATE TABLE "tx_history" ("id" SERIAL NOT NULL, "timestamp" TIMESTAMP NOT NULL, "tx_hash" character varying NOT NULL, "pair" character varying NOT NULL, "action" character varying NOT NULL, "token_0" character varying NOT NULL, "token_0_amount" numeric(40) NOT NULL, "token_1" character varying NOT NULL, "token_1_amount" numeric(40) NOT NULL, CONSTRAINT "PK_9866cdcdcb81494bd63d563d7a5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1b17a36676e0f507c148d743ce" ON "tx_history" ("pair") `);
        await queryRunner.query(`CREATE TABLE "block" ("id" SERIAL NOT NULL, "height" integer NOT NULL, CONSTRAINT "PK_d0925763efb591c2e2ffb267572" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "pair_day_data" ("id" SERIAL NOT NULL, "timestamp" TIMESTAMP NOT NULL, "pair" character varying NOT NULL, "token_0" character varying NOT NULL, "token_0_volume" numeric(40) NOT NULL, "token_0_reserve" numeric(40) NOT NULL, "token_1" character varying NOT NULL, "token_1_volume" numeric(40) NOT NULL, "token_1_reserve" numeric(40) NOT NULL, "total_lp_token_share" numeric(40) NOT NULL, "volume_ust" numeric(40) NOT NULL, "liquidity_ust" numeric(40) NOT NULL, "txns" integer NOT NULL, CONSTRAINT "PK_ac35ed26ab0c71d491a62e2881a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_763afb7f80e4faef725bbe3624" ON "pair_day_data" ("pair") `);
        await queryRunner.query(`CREATE TABLE "pair_hour_data" ("id" SERIAL NOT NULL, "timestamp" TIMESTAMP NOT NULL, "pair" character varying NOT NULL, "token_0" character varying NOT NULL, "token_0_volume" numeric(40) NOT NULL, "token_0_reserve" numeric(40) NOT NULL, "token_1" character varying NOT NULL, "token_1_volume" numeric(40) NOT NULL, "token_1_reserve" numeric(40) NOT NULL, "total_lp_token_share" numeric(40) NOT NULL, "volume_ust" numeric(40) NOT NULL, "liquidity_ust" numeric(40) NOT NULL, "txns" integer NOT NULL, CONSTRAINT "PK_ffc544bb3e72cfd3e48a8b01452" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_72c9d4d03d369aa879000a4909" ON "pair_hour_data" ("pair") `);
        await queryRunner.query(`CREATE TABLE "terra_swap_day_data" ("id" SERIAL NOT NULL, "timestamp" TIMESTAMP NOT NULL, "volume_ust" numeric(40) NOT NULL, "total_liquidity_ust" numeric(40) NOT NULL, "txns" integer NOT NULL, CONSTRAINT "PK_ad8464c2aeba832d0fa06d8bce7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "recent_24h" ("id" SERIAL NOT NULL, "pair" character varying NOT NULL, "timestamp" TIMESTAMP NOT NULL, "token_0" character varying NOT NULL, "token_0_volume" numeric(40) NOT NULL, "token_1" character varying NOT NULL, "token_1_volume" numeric(40) NOT NULL, "volume_ust" numeric(40) NOT NULL, CONSTRAINT "PK_37c8dc7821eb6f2862bb73a3221" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "recent_24h"`);
        await queryRunner.query(`DROP TABLE "terra_swap_day_data"`);
        await queryRunner.query(`DROP INDEX "IDX_72c9d4d03d369aa879000a4909"`);
        await queryRunner.query(`DROP TABLE "pair_hour_data"`);
        await queryRunner.query(`DROP INDEX "IDX_763afb7f80e4faef725bbe3624"`);
        await queryRunner.query(`DROP TABLE "pair_day_data"`);
        await queryRunner.query(`DROP TABLE "block"`);
        await queryRunner.query(`DROP INDEX "IDX_1b17a36676e0f507c148d743ce"`);
        await queryRunner.query(`DROP TABLE "tx_history"`);
        await queryRunner.query(`DROP TABLE "token_info"`);
        await queryRunner.query(`DROP TABLE "pair_info"`);
        await queryRunner.query(`DROP TABLE "exchange_rate"`);
    }

}
