import { Request as exRequest, Response, NextFunction, response, Router } from "express";
import { getRepository, getConnection, getManager, ConnectionOptions } from "typeorm";
import { Tags, Route, Post, Security, Request, Body, Delete, Path } from "tsoa";
import { Service, ServiceStatus } from '../../entity/manager/Service';
import ApplicationError from "../../ApplicationError";
import { Meta } from '../../entity/manager/Meta';
import { MetaColumn } from "../../entity/manager/MetaColumn";
import multer from "multer";
import property from "../../../property.json";
import * as Excel from 'exceljs';
import MysqlMetaLoadStrategy from "../../lib/strategies/MysqlMetaLoadStrategy";
import MetaLoader from "../../lib/MetaLoader";
import MetaLoadStrategy from "../../lib/MetaLoadStrategy";
import XlsxMetaLoadStrategy from "../../lib/strategies/XlsxMetaLoadStrategy";
import CubridMetaLoadStrategy from "../../lib/strategies/CubridMetaLoadStrategy copy";
import CsvMetaLoadStrategy from "../../lib/strategies/CsvMetaLoadStrategy";

@Route("/api/metas")
@Tags("Meta")
export class ApiMetaController {

  @Post("/dbms")
  @Security("jwt")
  public async postDbms(
    @Request() request: exRequest,
    @Body() dbmsParams: postDbmsParams
  ): Promise<Meta> {
    return new Promise(async function(resolve, reject) {
      const metaRepo = getRepository(Meta);
      const serviceRepo = getRepository(Service);
      const metaColumnRepo = getRepository(MetaColumn);
      const { serviceId, title, dbms, host, port, database, user, password, table } = dbmsParams;
      if(title.length == 0 
        || dbms.length == 0 
        || host.length == 0 
        || port.length == 0 
        || database.length == 0 
        || user.length == 0 
        || table.length == 0) {
        reject(new ApplicationError(400, "Need all params"));
      }
      try {
        const service = await serviceRepo.findOneOrFail(serviceId);
        const connectionInfo = {
          dbms: dbms,
          username: user,
          password: password,
          hostname: host,
          port: port,
          database: database,
          tableNm: table,
          title: title
        }

        let loadStrategy: MetaLoadStrategy;
        switch(connectionInfo.dbms) {
          case 'mysql':
            loadStrategy = new MysqlMetaLoadStrategy();
            break;
          case 'cubrid':
            loadStrategy = new CubridMetaLoadStrategy();
            break;
          default:
            throw new Error("unexceptable dbms");
        }
        const metaLoader = new MetaLoader(loadStrategy);
        const loaderResult = await metaLoader.loadMeta(connectionInfo);
        const meta = loaderResult.meta;
        const columns = loaderResult.columns;
        let updatedMeta;
        
        service.meta = meta;
        await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
          updatedMeta = await metaRepo.save(meta);
          await metaColumnRepo.save(columns);
          service.status = ServiceStatus.METALOADED;
          await serviceRepo.save(service);
        });
        updatedMeta = await metaRepo.findOneOrFail({
          relations: ["service", "columns"],
          where: {
            id: updatedMeta.id
          }
        });
        resolve(updatedMeta);
      } catch (err) {
        console.error(err);
        reject(new ApplicationError(500, err.message));
        return;
      }
    });
  }

  /**
   * File upload의 경우 api doc 생성을 위해서는 tsoa.json에 param 설정을 해야함.
   *  body param 정보는 tsoa.json을 참고해주세요.
   * @param request 
   */
  @Post("/file")
  @Security("jwt")
  public async postFile(
    @Request() request: exRequest
  ): Promise<any> {
    const serviceRepo = getRepository(Service);
    const metaRepo = getRepository(Meta);
    const metaColumnRepo = getRepository(MetaColumn);
    await this.handleFile(request);
    return new Promise(async function(resolve, reject) {
      try {
        const { title, skip, sheet, serviceId } = request.body;
        const service = await serviceRepo.findOneOrFail(serviceId);
        
        const filePath = request.file.path;
        const originalFileName:string = request.file.originalname;
        const originalFileNameTokens = originalFileName.split(".");
        const ext = originalFileNameTokens[originalFileNameTokens.length - 1]

        const fileParam = {
          title: title,
          skip: skip,
          sheet: sheet,
          filePath: filePath,
          originalFileName: originalFileName,
          ext: ext
        }
        let loadStrategy: MetaLoadStrategy;
        switch(ext) {
          case 'xlsx':
            loadStrategy = new XlsxMetaLoadStrategy();
            break;
          case 'csv':
            loadStrategy = new CsvMetaLoadStrategy();
            break;
          default:
            throw new Error("unexceptable file extension");
        }
        const metaLoader = new MetaLoader(loadStrategy);
        const loaderResult = await metaLoader.loadMeta(fileParam);
        const meta = loaderResult.meta;
        const columns = loaderResult.columns;
        let updatedMeta;
        
        service.meta = meta;
        await getManager().transaction("SERIALIZABLE", async transactionalEntityManager => {
          updatedMeta = await metaRepo.save(meta);
          await metaColumnRepo.save(columns);
          service.status = ServiceStatus.METALOADED;
          await serviceRepo.save(service);
        });
        updatedMeta = await metaRepo.findOneOrFail({
          relations: ["service", "columns"],
          where: {
            id: updatedMeta.id
          }
        });
        resolve(updatedMeta);
      } catch (err) {
        console.error(err);
        reject(new ApplicationError(500, err.message));
      }
    })
  }

  private handleFile(request: exRequest): Promise<any> {
    var storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, property["upload-dist"].localPath)
      },
      filename: function (req, file, cb) {
        const originalFileName:string = file.originalname;
        const originalFileNameTokens = originalFileName.split(".");
        const ext = originalFileNameTokens[originalFileNameTokens.length - 1]
        cb(null, req.user.id + "-" + Date.now() + "." + ext)
      }
    })
    const multerSingle = multer({ storage }).single("file");
    return new Promise((resolve, reject) => {
      multerSingle(request, undefined, async (error) => {
        if (error) {
          reject(error);
        }
        resolve();
      });
    });
  }
}

interface postDbmsParams {
  serviceId: number,
  title: string,
  dbms: string,
  host: string,
  port: string,
  database: string,
  user: string,
  password:string,
  table: string
}