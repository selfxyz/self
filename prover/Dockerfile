FROM python:3.10

WORKDIR /root
RUN apt-get update && apt-get upgrade -y 
# Update the package list and install necessary dependencies
RUN apt-get update && apt-get install -y bash
RUN apt-get update && \
    apt install -y cmake build-essential pkg-config libssl-dev libgmp-dev libsodium-dev nasm git awscli gcc nodejs npm 
# Install jq
RUN apt-get update && apt-get install -y jq

# Node install
RUN npm install -g n 
RUN n 18
RUN npm install -g yarn snarkjs

RUN git clone https://github.com/iden3/rapidsnark-old.git rapidsnark
WORKDIR /root/rapidsnark
RUN yarn
RUN git submodule init
RUN git submodule update
RUN npx task createFieldSources
RUN npx task buildPistache
RUN npx task buildProver
RUN chmod +x build/prover

# Ensure the prover is available in the expected location
#RUN ln -s /root/rapidsnark/build/prover /root/src/rapidsnark/build/prover

WORKDIR /root