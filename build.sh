sudo docker login ajmfco42-01.ajm.net:5000
sudo docker build -t ajmfco42-01.ajm.net:5000/sunstealer-platform .
sudo docker push ajmfco42-01.ajm.net:5000/sunstealer-platform
# sudo docker logout ajmfco42-01.ajm.net:5000
kubectl create secret tls kong-proxy-tls --cert=../tls.crt --key=../tls.key -n ajm