import * as restify from "restify";
import fs = require('fs');
import events = require('events');
import Logger = require("bunyan");
import {AppConstants} from "./constant/app-constants";
import {nconf} from "./config/config";
import {log} from "util";
import helmet = require("helmet");
import db = require("dynongo");

// load all injectable entities.
// the @provide() annotation will then automatically register them.
import './ioc/loader';

/**
 * The server.
 *
 * @class Server
 */
export class ServerBase {

  public app: restify.Server;
  protected logger: Logger;

  /**
   * Constructor.
   *
   * @class Server
   * @constructor
   */
  constructor() {
  }

  bootstrap() {
    // this.mongoose();
    this.logger = Logger.createLogger({
      name: AppConstants.APP_NAME
    });
    this.dynongo();
  }

  protected listen(app) {
    app.listen(this.getPort(), this.getHost(), () => {
      log(`${app.name} listening at ${app.url}`);
    });
  }

  /**
   * Create mongoose connection
   */
  protected dynongo() {
    const AWS = require("aws-sdk");

    AWS.config.update({
      region: "us-west-2",
      endpoint: "http://localhost:8000"
    });

    const docClient = new AWS.DynamoDB.DocumentClient();
    db.connect(docClient);

    console.log(`Dynongo connected ${db}`);
  }

  /**
   * Configure application
   *
   * @class Server
   * @method config
   */
  protected config(app) {
    // configure cors
    app.use(restify.CORS({
      origins: nconf.get("server:origins"),   // defaults to ['*']
      credentials: false,                 // defaults to false
    }));

    // to get query params in req.query
    // this.server.use(restify.queryParser());
    app.use(restify.acceptParser(app.acceptable));
    // to get passed json in req.body
    app.use(restify.bodyParser());

    // error handler
    app.on('error', (error) => {
      this.onError(error);
    });
    // process exceptions
    app.on('uncaughtException', function (request, response, route, error) {
      console.error(error.stack);
      response.send(error);
    });
    // audit logger
    app.on('after', restify.auditLogger({
      log: this.logger
    }));

    app.use(helmet());
  }

  // protected configPassport(app) {
  //   let userService = container.get<UserService>(TYPES.UserService);
  //   // setup strategies
  //   let strategies = setupPassport();
  //   strategies.forEach((strategy) => {
  //     userService.passport.use(strategy);
  //   });
  //   app.use(passport.initialize());
  //   app.use(passport.session());
  // }

  /**
   * get port from env or config.json
   * @returns {number}
   */
  getPort(): number {
    return ServerBase.normalizePort(process.env.PORT || nconf.get("server:port") || 3000);
  }

  /**
   * get host from env or config.json
   * @returns {string}
   */
  getHost(): string {
    return process.env.HOST || nconf.get("server:host") || 'localhost';
  }

  /**
   * validate port
   * @param val
   * @returns {number}
   */
  static normalizePort(val): number {
    const port = parseInt(val, 10);

    if (isNaN(port)) {
      // named pipe
      return val;
    }

    if (port >= 0) {
      // port number
      return port;
    }

    throw 'Invalid port';
  }

  /**
   * Event listener for HTTP server "error" event.
   */
  private onError(error) {
    if (error.syscall !== 'listen') {
      throw error;
    }

    const bind = typeof this.getPort() === 'string'
      ? 'Pipe ' + this.getPort()
      : 'Port ' + this.getPort();

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  }

}
