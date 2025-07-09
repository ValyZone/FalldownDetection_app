To start the server be sure to have mongodb downloaded and have a database setup properly.
If you don't have mongodb downloaded, you can get it from here:

        https://www.mongodb.com/try/download/shell

Unpack the downloaded ZIP file into the repo (mototime), and create a mongodb-data folder inside the 'server' folder.

Before starting the server with 'npm run start:server' be sure to start mongodb as well.

You have to start mongodb using windows Terminal with the following command:
 
     start <PATH_TO_MONGOD.EXE>\mongod.exe --dbpath ".\mongodb-data"

After you started the database you can safely start the server as well.


Server is listening to PORT: 3030 !!