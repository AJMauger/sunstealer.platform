FROM node
EXPOSE 8080
COPY ./src/ /
RUN ls -laR src/
RUN npm install
# CMD ["sleep", "525600"]
CMD ["npm", "start"]
