import {
  PublicKey,
  publicKey,
  Umi,
} from "@metaplex-foundation/umi";
import { DigitalAssetWithToken, JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import dynamic from "next/dynamic";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useUmi } from "../utils/useUmi";
import { fetchCandyMachine, safeFetchCandyGuard, CandyGuard, CandyMachine, AccountVersion } from "@metaplex-foundation/mpl-candy-machine"
import styles from "../styles/Home.module.css";
import { guardChecker } from "../utils/checkAllowed";
import { Center, Card, CardHeader, CardBody, StackDivider, Heading, Stack, useToast, Text, Skeleton, useDisclosure, Button, Modal, ModalBody, ModalCloseButton, ModalContent, Image, ModalHeader, ModalOverlay, Box, Divider, VStack, Flex } from '@chakra-ui/react';
import { ButtonList } from "../components/mintButton";
import { GuardReturn } from "../utils/checkerHelper";
import { ShowNft } from "../components/showNft";
import { InitializeModal } from "../components/initializeModal";
import { image, headerText } from "../settings";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
//<link href="https://fonts.googleapis.com/css2?family=IM+Fell+English&display=swap" rel="stylesheet">


const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const useCandyMachine = (
  umi: Umi,
  candyMachineId: string,
  checkEligibility: boolean,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>,
  firstRun: boolean,
  setfirstRun: Dispatch<SetStateAction<boolean>>
) => {
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [candyGuard, setCandyGuard] = useState<CandyGuard>();
  const toast = useToast();


  useEffect(() => {
    (async () => {
      if (checkEligibility) {
        if (!candyMachineId) {
          console.error("No candy machine in .env!");
          if (!toast.isActive("no-cm")) {
            toast({
              id: "no-cm",
              title: "No candy machine in .env!",
              description: "Add your candy machine address to the .env file!",
              status: "error",
              duration: 999999,
              isClosable: true,
            });
          }
          return;
        }

        let candyMachine;
        try {
          candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineId));
          //verify CM Version
          if (candyMachine.version != AccountVersion.V2){
            toast({
              id: "wrong-account-version",
              title: "Wrong candy machine account version!",
              description: "Please use latest sugar to create your candy machine. Need Account Version 2!",
              status: "error",
              duration: 999999,
              isClosable: true,
            });
            return;
          }
        } catch (e) {
          console.error(e);
          toast({
            id: "no-cm-found",
            title: "The CM from .env is invalid",
            description: "Are you using the correct environment?",
            status: "error",
            duration: 999999,
            isClosable: true,
          });
        }
        setCandyMachine(candyMachine);
        if (!candyMachine) {
          return;
        }
        let candyGuard;
        try {
          candyGuard = await safeFetchCandyGuard(umi, candyMachine.mintAuthority);
        } catch (e) {
          console.error(e);
          toast({
            id: "no-guard-found",
            title: "No Candy Guard found!",
            description: "Do you have one assigned?",
            status: "error",
            duration: 999999,
            isClosable: true,
          });
        }
        if (!candyGuard) {
          return;
        }
        setCandyGuard(candyGuard);
        if (firstRun){
          setfirstRun(false)
        }
      }
    })();
  }, [umi, checkEligibility]);

  return { candyMachine, candyGuard };


};


export default function Home() {
  const umi = useUmi();
  const solanaTime = useSolanaTime();
  const toast = useToast();
  const { isOpen: isShowNftOpen, onOpen: onShowNftOpen, onClose: onShowNftClose } = useDisclosure();
  const { isOpen: isInitializerOpen, onOpen: onInitializerOpen, onClose: onInitializerClose } = useDisclosure();
  const [mintsCreated, setMintsCreated] = useState<{ mint: PublicKey, offChainMetadata: JsonMetadata | undefined }[] | undefined>();
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: "startDefault", allowed: false, maxAmount: 0 },
  ]);
  const [firstRun, setFirstRun] = useState(true);
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true);


// Ajoute ce useEffect juste après
useEffect(() => {
  const fetchMetadata = async (uri: string) => {
    const response = await fetch(uri);
    return await response.json();
  };

  const fetchTokensMetadata = async () => {
    if (ownedTokens) {
      const tokensWithMetadata = await Promise.all(
        ownedTokens.map(async (token) => {
          const metadata = await fetchMetadata(token.metadata.uri); // Assure-toi que c'est le bon champ
          return { ...token, metadata };
        })
      );
      setOwnedTokens(tokensWithMetadata);
    }
  };

  fetchTokensMetadata();
}, [ownedTokens]);





  if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
    console.error("No candy machine in .env!")
    if (!toast.isActive('no-cm')) {
      toast({
        id: 'no-cm',
        title: 'No candy machine in .env!',
        description: "Add your candy machine address to the .env file!",
        status: 'error',
        duration: 999999,
        isClosable: true,
      })
    }
  }
  const candyMachineId: PublicKey = useMemo(() => {
    if (process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      return publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
    } else {
      console.error(`NO CANDY MACHINE IN .env FILE DEFINED!`);
      toast({
        id: 'no-cm',
        title: 'No candy machine in .env!',
        description: "Add your candy machine address to the .env file!",
        status: 'error',
        duration: 999999,
        isClosable: true,
      })
      return publicKey("11111111111111111111111111111111");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { candyMachine, candyGuard } = useCandyMachine(umi, candyMachineId, checkEligibility, setCheckEligibility, firstRun, setFirstRun);

  useEffect(() => {
    const checkEligibilityFunc = async () => {
      if (!candyMachine || !candyGuard || !checkEligibility || isShowNftOpen) {
        return;
      }
      setFirstRun(false);
      
      const { guardReturn, ownedTokens } = await guardChecker(
        umi, candyGuard, candyMachine, solanaTime
      );

      setOwnedTokens(ownedTokens);
      setGuards(guardReturn);
      setIsAllowed(false);

      let allowed = false;
      for (const guard of guardReturn) {
        if (guard.allowed) {
          allowed = true;
          break;
        }
      }

      setIsAllowed(allowed);
      setLoading(false);
    };

    checkEligibilityFunc();
    // On purpose: not check for candyMachine, candyGuard, solanaTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umi, checkEligibility, firstRun]);

  const PageContent = () => {
    return (
      <>
        <style jsx global>
          {`
      body {
          margin: 0;
            padding: 0;
            height: 100vh; /* Pour permettre le scroll */
            background-image: linear-gradient(rgba(99, 64, 0, 0.2), rgba(255, 255, 0, 0.2)), url('https://olive-broad-giraffe-200.mypinata.cloud/ipfs/QmQTQaNzfAYfRcG5X1wpRLa7mi1GDF138zdp8jPXe8BWnK');
            background-attachment: fixed;
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
       }
   `}
        </style>



<div style={{
    position: 'absolute',
    top: -400,
    left: '7%',
    width: '20%', // Pour couvrir toute la largeur
    height: '100%', // Pour couvrir toute la hauteur
    zIndex: -1, // Positionne l'image derrière les autres éléments
    backgroundImage: "url('https://olive-broad-giraffe-200.mypinata.cloud/ipfs/QmQygXtXVzFCp7LcQbukPRYeCcBrmZ3mQGqSqwbAK486Wf')",
    backgroundSize: 'cover', // Pour couvrir toute la div
    //backgroundPosition: 'center' // Centre l'image
  }}></div>




<div style={{
    position: 'absolute',
    top: -400,
    left: '75%',
    width: '20%', // Pour couvrir toute la largeur
    height: '100%', // Pour couvrir toute la hauteur
    zIndex: -1, // Positionne l'image derrière les autres éléments
    backgroundImage: "url('https://olive-broad-giraffe-200.mypinata.cloud/ipfs/QmQygXtXVzFCp7LcQbukPRYeCcBrmZ3mQGqSqwbAK486Wf')",
    backgroundSize: 'cover', // Pour couvrir toute la div
    //backgroundPosition: 'center' // Centre l'image
  }}></div>


        
        

<div style={{ marginTop: '5em' }}>




 {/* Zone du Mint */}
 <div style={{
  margin: '2em 0',
  padding: '1em',
  color: 'white',
  fontSize: '140%',
  border: '1px solid black',
  boxShadow: `
          0px 0px 3px black
        `,
  borderRadius: '8px',
  backgroundColor: 'transparent', // Fond transparent pour voir l'image
  textAlign: 'center',
  backgroundImage: `url('https://olive-broad-giraffe-200.mypinata.cloud/ipfs/QmPWNP1nsrxTH342juNwLqLGqvTxZFjWNG5zJ8ggobDAXU')`, // Image de fond
  backgroundSize: 'cover', // Pour couvrir toute la div
  backgroundPosition: 'center' // Pour centrer l'image
}}>
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <h2 style={{
      marginBottom: '0.5em',
      color: 'white',
      textShadow: `
        0 0 5px pink,
        0 0 10px pink,
        0 0 20px magenta,
        0 0 30px magenta
      `,
      fontWeight: 'bold',
      textTransform: 'uppercase', // Mettre le texte en majuscules
      border: '5px solid white', // Bordure blanche
      padding: '10px',
      borderRadius: '8px',
      display: 'inline-block',
      backgroundColor: 'transparent', // Fond clair pour faire ressortir l'ombre
      position: 'relative',
      //transform: 'skew(-5deg)',
      transform: 'rotate(-1deg)',
      boxShadow: `
      0 0 5px pink,
      0 0 8px pink,
      0 0 10px magenta,
      0 0 12px magenta
      `
    }}>
      Welcome to the Gobelin Rave!
      <span style={{
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'transparent',
    boxShadow: `
      inset 0 0 5px pink,
      inset 0 0 8px pink,
      inset 0 0 10px magenta,
      inset 0 0 12px magenta
    `,
    zIndex: +1 // Met l'ombre derrière le texte
  }} />
    </h2>
    
    <div style={{
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      marginTop: '10px'
      }}>
      <img style={{
        height: '230px',
        objectFit: 'cover',
        border: '1px solid black',
        borderRadius: '9.5px',
        margin: '0% 20% 0% 0%',
        cursor: 'pointer',
        boxShadow: `
          0 0 5px black,
          0 0 10px brown,
          0 0 20px brown
        `,
        }} alt="project Image" src={image} />
    
    {/* Zone pour le nombre de NFTs restants */}
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: '20px'}}>
    {!loading && (
      <div style={{
      /*backgroundColor: 'teal',*/
      whiteSpace: 'nowrap',
      fontSize: '80%',
      borderRadius: '5px',
      //padding: '8px',
      minWidth: '50px',
      minHeight: '50px',
      }}>
        <div>
        <p style={{
          textTransform: 'uppercase',
          fontSize: '30px',                        // Taille de la police
          fontWeight: 900,
          color: '#3b1a00',                        // Couleur marron bois
          textShadow: `1px 1px black`,
          letterSpacing: '2px',                    // Espacement des lettres pour un effet plus prononcé
          //padding: '10px',                         // Espacement autour du texte
          boxShadow: `
            inset 0 0 5px rgba(0, 0, 0, 0.4),      // Ombre interne pour effet creusé
            5px 5px 10px rgba(0, 0, 0, 0.6)        // Ombre externe pour relief
          `
        }}>
  Available<br />Gobelins:<br />
  {Number(candyMachine?.data.itemsAvailable) - Number(candyMachine?.itemsRedeemed)}/{Number(candyMachine?.data.itemsAvailable)}
          </p>
        </div>
      </div>
    )}
    </div>



    </div>
  </div>

  <div style={{ marginTop: '20px', fontSize: '150%'}}>
    {loading ? (
      <div>
        <div style={{ height: '30px', margin: '10px', backgroundColor: '#f0f0f0' }}></div>
        <div style={{ height: '30px', margin: '10px', backgroundColor: '#f0f0f0' }}></div>
        <div style={{ height: '30px', margin: '10px', backgroundColor: '#f0f0f0' }}></div>
      </div>
    ) : (
      <ButtonList
        guardList={guards}
        candyMachine={candyMachine}
        candyGuard={candyGuard}
        umi={umi}
        ownedTokens={ownedTokens}
        setGuardList={setGuards}
        mintsCreated={mintsCreated}
        setMintsCreated={setMintsCreated}
        onOpen={onShowNftOpen}
        setCheckEligibility={setCheckEligibility}
      />
    )}
  </div>

  {umi.identity.publicKey === candyMachine?.authority && (
    <div style={{ textAlign: 'center', marginTop: '10px' }}>
      <button style={{ backgroundColor: 'red', padding: '10px' }} onClick={onInitializerOpen}>Initialize Everything!</button>
    </div>
  )}
</div>



  {/* Zone d'Affichage des NFTs */}
  <div id="nft-display" style={{ marginTop: '5em', padding: '1em', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
    <h2 style={{textAlign: 'center', marginBottom: '10px'}}>Mes NFTs</h2>
    {loading ? (
      <p>Chargement des NFTs...</p>
    ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          justifyContent: 'center',
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >
        {ownedTokens?.length ? (
          ownedTokens.map((token, index) => (
            <div key={index} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px', backgroundColor: '#fff', textAlign: 'center' }}>
              {/*<img src={token.metadata.image} alt={token.metadata.name} style={{ width: '200%', height: 'auto', objectFit: 'contain' }} />*/}
              <p style={{ fontWeight: 'bold' }}>{token.metadata.name}</p>
            </div>
          ))
        ) : (
          <p>Tu n'as pas encore de NFTs.</p>
        )}
      </div>
    )}
  </div>
</div>











      </>
    );
  };

  return (
    <main>
      <div className={styles.wallet}>
        <WalletMultiButtonDynamic />
      </div>

      <div className={styles.center}>
        <PageContent key="content" />
      </div>
    </main>
  );
}
