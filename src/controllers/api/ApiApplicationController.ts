import { getRepository, getConnection, getManager, ConnectionOptions } from "typeorm";
import { DatabaseConnection, AcceptableDbms } from "../../entity/manager/DatabaseConnection";
import { Route, Get, Tags, Security, Path, Request, Post, Body } from "tsoa";
import { Request as exRequest } from "express";
import { Application } from "../../entity/manager/Application";

@Route("/api/applications")
@Tags("Applications")
export class ApiApplicationController {

  @Get("/")
  @Security("jwt")
  public async get(
    @Request() request: exRequest
  ){
    return new Promise(async function(resolve, reject) {
      const appRepo = getRepository(Application);
    try {
      const apps = await appRepo.find({
        where: {
          user: {
            id: request.user.id
          }
        }
      });
      resolve(apps);
    } catch (err) {
      console.error(err);
      reject(err);
    }
    });
  }

  @Post("/")
  @Security("jwt")
  public async put(
    @Request() request: exRequest,
    @Body() applicationParams: ApplicationParams
  ): Promise<Application> {
    return new Promise(async function(resolve, reject) {
      const applicationRepo = getRepository(Application);
      const { namespace, title, description } = applicationParams;
      try {
        const newApplication = new Application();
        newApplication.nameSpace = namespace;
        newApplication.title = title;
        newApplication.description = description;
        newApplication.user = request.user;
        await applicationRepo.save(newApplication);

        resolve(newApplication);
      } catch (err) {
        console.error(err);
        reject(err);
        return;
      }
    });
  }
}

interface ApplicationParams {
  namespace: string,
  title: string,
  description: string
}