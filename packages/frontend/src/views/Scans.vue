<script setup lang="ts">
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";

import { splitterPanelPt, splitterPt } from "@/components/pt";
import { ResultDetails } from "@/components/Scans/ResultDetails";
import { ResultsTable } from "@/components/Scans/ResultsTable";
import { ScansTable } from "@/components/Scans/ScansTable";
</script>

<template>
  <div class="h-full flex flex-col min-h-0">
    <Splitter :pt="splitterPt">
      <SplitterPanel :size="30" :min-size="20" :pt="splitterPanelPt">
        <ScansTable />
      </SplitterPanel>
      <SplitterPanel :size="70" :min-size="30" :pt="splitterPanelPt">
        <Splitter layout="vertical" :pt="splitterPt">
          <SplitterPanel :size="45" :min-size="20" :pt="splitterPanelPt">
            <ResultsTable />
          </SplitterPanel>
          <SplitterPanel :size="55" :min-size="20" :pt="splitterPanelPt">
            <ResultDetails />
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
