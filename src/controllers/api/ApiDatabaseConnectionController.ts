import { getRepository, getConnection, getManager, ConnectionOptions } from "typeorm";
import ApplicationError from "../../ApplicationError";
import { DatabaseConnection, AcceptableDbms } from "../../entity/manager/DatabaseConnection";
import { User } from "../../entity/manager/User";
import { MysqlHelper } from "../../helpers/MysqlHelper";
import { needAuth } from "../../middlewares/checkAuth";
import { Route, Get, Tags, Security, Path, Request, Post, Body } from "tsoa";
import { reject } from "lodash";
import { resolve } from "url";
import { Request as exRequest } from "express";

@Route("/api/database-connections")
@Tags("Database Connection")
export class ApiDatabaseConnectionController {

  @Get("/")
  @Security("jwt")
  public async get(
    @Request() request: exRequest
  ){
    return new Promise(async function(resolve, reject) {
      const dbcRepo = getRepository(DatabaseConnection);
    try {
      const dbcs = await dbcRepo.find({
        where: {
          user: {
            id: request.user.id
          }
        }
      });
      resolve(dbcs);
    } catch (err) {
      reject(err);
    }
    });
  }
  
  /**
   * Database Connection의 상세 정보를 보여줍니다.
   * @param connectionId Database Connection의 id
   */
  @Get("/{connectionId}")
  @Security("jwt")
  public async getConnection(
    @Request() request: exRequest,
    @Path() connectionId: number
  ){
    return new Promise(async function(resolve, reject) {
      const dbcRepo = getRepository(DatabaseConnection);
      try {
        const dbc = await dbcRepo.findOneOrFail({
          where: {
            id: connectionId,
            user: {
              id: request.user.id
            }
          }
        });
        resolve(dbc);
      } catch(err) {
        reject(err);
      }
    })
  }

  /**
   * DB에 접속하여 Table 목록을 불러옵니다.
   * @param connectionId 
   */
  @Get("/{connectionId}/tables")
  @Security("jwt")
  public async getTablesInConnection(
    @Request() request: exRequest,
    @Path() connectionId: number
  ){
    return new Promise(async function(resolve, reject) {
      const dbcRepo = getRepository(DatabaseConnection);
      try {
        const dbc = await dbcRepo.findOneOrFail({
          where: {
            id: connectionId,
            user: {
              id: request.user.id
            }
          }
        });
        resolve(dbc);
      } catch(err) {
        reject(err);
      }
    })
  }

  /**
   * DB에 접속하여 Table의 컬럼 목록과 정보를 가져옵니다.
   * @param connectionId 
   * @param tableName 정보를 가져오려는 테이블 명
   */
  @Get("/{connectionId}/tables/{tableName}")
  @Security("jwt")
  public async getTable(
    @Request() request: exRequest,
    @Path() connectionId: number,
    @Path() tableName: string
  ){
    return new Promise(async function(resolve, reject) {
      const dbcRepo = getRepository(DatabaseConnection);
      try {
        const dbc = await dbcRepo.findOneOrFail({
          where: {
            id: connectionId,
            user: {
              id: request.user.id
            }
          }
        });
        resolve(dbc);
      } catch(err) {
        reject(err);
      }
    })
  }

  @Post("/")
  @Security("jwt")
  public async post(
    @Request() request: exRequest,
    @Body() databaseConnectionCreateParams: DatabaseConnectionCreateParams
  ): Promise<DatabaseConnection>{
    return new Promise(async function(resolve, reject){
      const dbcRepo = getRepository(DatabaseConnection);
      const { title, host, port, db, user, pwd, dbms } = databaseConnectionCreateParams;

      try {
        const newConnection = new DatabaseConnection();
        newConnection.connectionName = title;
        newConnection.hostname = host;
        newConnection.port = port;
        newConnection.database = db;
        newConnection.username = user;
        newConnection.password = pwd ? pwd : "";
        newConnection.dbms = dbms;
        newConnection.user = request.user;
        await dbcRepo.save(newConnection);
        resolve(newConnection);
      } catch(err) {
        reject(err);
      }
    })
  }
}

interface DatabaseConnectionCreateParams { 
  title: string, 
  host: string, 
  port: string,
  db: string,
  user: string,
  pwd: string,
  dbms: AcceptableDbms 
}