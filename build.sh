if [ ! -d "../docker-registry" ]; then
  echo "mkdir ../docker-registry"
  mkdir ../docker-registry
fi

sudo docker login ajmfco37-01.ajm.net:5000
# Dockerfile
sudo docker build -t ajmfco37-01.ajm.net:5000/sunstealer-platform .
sudo docker push ajmfco37-01.ajm.net:5000/sunstealer-platform
# sudo docker logout ajmfco37-01.ajm.net:5000

kubectl create secret tls sunstealer --namespace default --key ../Documents/sunstealer.key --cert ../Documents/sunstealer.crt

# scp -r src ajm@ajmfco37-02.ajm.net:/home/ajm/ 