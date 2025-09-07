<template>
  <div class="flex items-center gap-3 p-3 border-b border-gray-600">
    <!-- Logo Icon -->
    <div class="relative group">
      <div
        class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg lg:group-hover:scale-110 transition-transform duration-200"
      >
        <span class="text-white font-bold text-lg">E</span>
      </div>
      <!-- Glow effect -->
      <div
        class="absolute inset-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary opacity-50 blur-md -z-10"
      ></div>
    </div>

    <!-- Logo Text -->
    <div class="flex flex-col">
      <h1
        class="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
      >
        Enfyra
      </h1>
      <p class="text-xs text-muted-foreground font-medium tracking-wide">
        Content Management
      </p>
    </div>
  </div>
</template>
