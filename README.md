# Guide to Running This Application

This is a simple Node.js-based application that requires a few steps to run correctly.

## Steps

### 1. Setting Up Credentials

Copy ```.env.example``` to ```.env``` and set your credentials there.

### 2. Installing Dependencies

First, ensure you have installed Node.js on your computer. After that, open the terminal or command prompt and execute the following command to install the necessary dependencies:
   ```bash
   npm install
   ```

### 3. Running Application

After successfully installing the dependencies, use the following command to run the application:
   ```bash
   node app
   ```
This will run the Node.js application on your local server.

### 4. Accessing Application

Once you've executed the above command, the application will run, and you can access it through a web browser by opening `http://localhost:port`, where the `port` (default 3000) is the port defined in your application.

Note: Ensure there are no errors during the installation process or when running the application. If you encounter any issues, check for error messages or logs that appear in the terminal or command prompt.

### 5. API call

#### 1. Create User
`POST` 
```bash
/user
```

Body 
```bash
Aplication/json
```
```json
{
  "first_name": "Ilham",
  "last_name": "Riski",
  "email": "ilhamrisky21@gmail.com",
  "birthday": "1996-12-12",
  "city": "New York",
  "status": "active"
}
```
or
```json
{
  "first_name": "Ilham",
  "last_name": "Riski",
  "email": "ilhamrisky21@gmail.com",
  "birthday": "1996-10-21",
  "city": "Semarang",
  "status": "active"
}
```
#### 2. Update
`PUT`
```bash
/user/:id
```

Body 
```bash
Aplication/json
```
```json
{
  "first_name": "updated first name",
  "last_name": "updated last name",
  "email": "updated email",
  "birthday": "updated birtday",
  "city": "updated city",
  "status": "updated status"
}
```
#### 3. Delete
`DELETE`
```bash
/delete/:id
```
#### 4. Select
`GET`
```bash
/user/:id
```
#### 5. Select All
`GET`
```bash
/users
```