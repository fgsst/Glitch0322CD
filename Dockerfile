FROM node:slim

WORKDIR /app

COPY . .

EXPOSE 3000

RUN apt update -y &&\
    chmod +x red.js &&\
    npm install 
    
CMD ["node", "red.js"]
