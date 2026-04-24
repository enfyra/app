<script setup lang="ts">
const route = useRoute();

await navigateTo(route.fullPath.replace("/settings/routings", "/settings/routes"), {
  replace: true,
  redirectCode: 301,
});
</script>
