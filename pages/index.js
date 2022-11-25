import React, { useMemo } from "react";
import Head from "next/head";
import { withTheme } from "@material-ui/core/styles";
import Chain from "../components/chain";
import { fetcher, populateChain } from "../utils";
import { useSearch, useTestnets } from "../stores";
import Layout from "../components/Layout";
import classes from "../components/Layout/index.module.css";
import chains_source from "../constants/chains.json"

export async function getStaticProps({ locale }) {
  // const chains = await fetcher("https://raw.githubusercontent.com/jueduizone/pokt-chainlist/main/constants/chains.json");
  const chains = chains_source;
  // const chainTvls = await fetcher("https://api.llama.fi/chains");

  const sortedChains = chains
    .filter((c) => c.name !== "420coin") // same chainId as ronin
    // .map((chain) => populateChain(chain, chainTvls))
    .sort((a, b) => {
      return (b.tvl ?? 0) - (a.tvl ?? 0);
    });

  return {
    props: {
      sortedChains,
      messages: (await import(`../translations/${locale}.json`)).default,
    },
    revalidate: 3600,
  };
}

function Home({ changeTheme, theme, sortedChains }) {
  const testnets = useTestnets((state) => state.testnets);
  const search = useSearch((state) => state.search);

  const chains = useMemo(() => {
    if (!testnets) {
      return sortedChains.filter((item) => {
        const testnet =
          item.name?.toLowerCase().includes("test") ||
          item.title?.toLowerCase().includes("test") ||
          item.network?.toLowerCase().includes("test");
        const devnet =
            item.name?.toLowerCase().includes("devnet") ||
            item.title?.toLowerCase().includes("devnet") ||
            item.network?.toLowerCase().includes("devnet");
        return !testnet && !devnet;
      });
    } else return sortedChains;
  }, [testnets, sortedChains]);

  return (
    <>
      <Head>
        <title>POKT RPC List</title>
        <meta
          name="description"
          content="POKT RPClist is a list of decentralized RPC services supported by Pocket Network. You can use this tool to easily connect your wallets to several of Pocket's public RPC URLs across multiple chains. Pocket Network has tens of thousands of independent nodes to provide stable, fast, and decentralized RPC services with maximum uptime."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout changeTheme={changeTheme} theme={theme}>
        <div className={classes.cardsContainer}>
          {(search === ""
            ? chains
            : chains.filter((chain) => {
                //filter
                return (
                  chain.chain.toLowerCase().includes(search.toLowerCase()) ||
                  chain.chainId
                    .toString()
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                  chain.name.toLowerCase().includes(search.toLowerCase()) ||
                  (chain.nativeCurrency ? chain.nativeCurrency.symbol : "")
                    .toLowerCase()
                    .includes(search.toLowerCase())
                );
              })
          ).map((chain, idx) => {
            return <Chain chain={chain} key={idx} />;
          })}
        </div>
      </Layout>
    </>
  );
}

export default withTheme(Home);
