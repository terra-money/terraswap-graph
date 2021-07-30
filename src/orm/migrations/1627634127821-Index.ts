import {MigrationInterface, QueryRunner} from "typeorm";

export class Index1627634127821 implements MigrationInterface {
    name = 'Index1627634127821'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_9e23a3f1bf3634820c873a0fe8" ON "exchange_rate" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_81136755cb7716b61f87a7239a" ON "exchange_rate" ("pair") `);
        await queryRunner.query(`CREATE INDEX "IDX_54870cdcff3bfb78edb1f7bda7" ON "tx_history" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_22ec6e354368cc723f112cf334" ON "tx_history" ("action") `);
        await queryRunner.query(`CREATE INDEX "IDX_3ec75d38856b5c23abfa03eef3" ON "pair_day_data" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_d2447e7d55a0b102d8a29b3b96" ON "pair_hour_data" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_0d8bf605374035b814eebf1b6b" ON "terra_swap_day_data" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_2dd5e7dc354b62c9b5023c4382" ON "recent_24h" ("pair") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_2dd5e7dc354b62c9b5023c4382"`);
        await queryRunner.query(`DROP INDEX "IDX_0d8bf605374035b814eebf1b6b"`);
        await queryRunner.query(`DROP INDEX "IDX_d2447e7d55a0b102d8a29b3b96"`);
        await queryRunner.query(`DROP INDEX "IDX_3ec75d38856b5c23abfa03eef3"`);
        await queryRunner.query(`DROP INDEX "IDX_22ec6e354368cc723f112cf334"`);
        await queryRunner.query(`DROP INDEX "IDX_54870cdcff3bfb78edb1f7bda7"`);
        await queryRunner.query(`DROP INDEX "IDX_81136755cb7716b61f87a7239a"`);
        await queryRunner.query(`DROP INDEX "IDX_9e23a3f1bf3634820c873a0fe8"`);
    }

}
